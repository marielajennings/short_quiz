const express = require('express');
const path = require('path');
const fs = require('fs');
const basicAuth = require('basic-auth');

const getFileName = () => {
  const fullPath = __filename;
  const fileName = fullPath.replace(/^.*[\\\/]/, '');
  return fileName.replace('.js', '');
};

const fileName = getFileName();
const channelName = fileName + '_rpc_worker';
const taskQueueName = fileName + '_task_queue';

const checkUser = (username, password) => {
  const output = fs.readFileSync(path.resolve('./admin.txt'), 'utf-8');
  const outputArray = output.split('\n');
  const users = outputArray.map(currentEl => {
    return {
      username: currentEl.split(':')[0],
      password: currentEl.split(':')[1]
    };
  });
  return users.some(
    admin => admin.username === username && admin.password === password
  );
};
module.exports = (rpc, conn, dbWrite) => {
  const fileName = getFileName();
  const router = new express.Router();

  // get all questions for a quiz
  router.post('/getAllStimuli', (req, res, next) => {
    var rpcInput = {
      method: 'getAllStimuli',
      params: []
    };
    return rpc(conn, taskQueueName, rpcInput)
      .then(data => {
        res.json(data);
      })
      .catch(next);
    // create a channel
  });

  // save in db
  router.post('/stimulusResponse', (req, res, next) => {
    const user_id = req.body.user_id;
    const stimulus = req.body.stimulus;
    const data_string = req.body.data_string;
    const num_responses = parseInt(req.body.num_responses) + 1;
    const create = {
      method: 'createStimulusResponse',
      params: [{ user_id: user_id, stimulus: stimulus, data_string: data_string }]
    };
    const update = {
      method: 'raw',
      params: [`UPDATE "short-quiz_stimuli" SET "num_responses" = "num_responses" + 1 WHERE "stimulus" = '${stimulus}'`]
    };
    return dbWrite(conn, fileName + '_db_write', create)
    .then(() => {
      return dbWrite(conn, fileName + '_db_write', update);
    })
    .then(() => {
      res.sendStatus(200);
    })
    .catch(next);
  });

  // save in db
  router.post('/response', (req, res, next) => {
    const user_id = req.body.user_id;
    const data_string = req.body.data_string;
    const create = {
      method: 'createResponse',
      params: [{ user_id: user_id, data_string: data_string }]
    };
    return dbWrite(conn, fileName + '_db_write', create)
    .then(() => {
      res.sendStatus(200);
    })
    .catch(next);
  });

  // remove users with no responses after two hours - hit by cron job
  router.post('/clean', (req, res, next) => {
    const user = basicAuth(req);
    if (!user || !user.name || !user.pass) {
      res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
      return res.sendStatus(401);
    }
    if (checkUser(user.name, user.pass)) {
      const clean = {
        method: 'raw',
        params: [`DELETE FROM "short-quiz_users" WHERE "id" NOT IN (SELECT "user_id" FROM "short-quiz_responses" UNION SELECT "user_id" FROM "short-quiz_stimulusResponses") AND "created_at" < NOW() - INTERVAL '2 hours'`]
      };
      return dbWrite(conn, fileName + '_db_write', clean)
      .then(() => {
        res.sendStatus(200);
      })
      .catch(next);
    }
    else {
      res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
      return res.sendStatus(401);
    }
  });

  // get all responses in csv format for a quiz - needs work
  // router.get('/admincsv', (req, res, next) => {
  //   // TODO: refactor this to be set on contruction of the controller
  //   // possibly
  //   const user = basicAuth(req);
  //   if (!user || !user.name || !user.pass) {
  //     res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
  //     return res.sendStatus(401);
  //   }
  //   if (checkUser(user.name, user.pass)) {
  //     const rpcInput = {
  //       method: 'getResponseCsv',
  //       params: []
  //     };
  //     const channelName = fileName + '_rpc_worker';
  //     return rpc(conn, channelName, rpcInput)
  //       .then(data => {
  //         res.set('Content-Type', 'text/csv');
  //         res.send(data);
  //       })
  //       .catch(next);
  //   } else {
  //     res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
  //     res.sendStatus(401);
  //     return;
  //   }
  // });

  return router;
};
