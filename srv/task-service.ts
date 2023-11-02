import { Service } from "@sap/cds/apis/services";
import cds from "@sap/cds";
export = (srv: Service) => {
  const LOG = cds.log("sap.logm.srv.TaskService");
  const { Tasks, Timers } = srv.entities;

  // init global members
  LOG.log("init memebers");
  let timers = [{ instanceId: 0 }];

  srv.on("READ", Timers, (req) => {
    LOG.info("Get timers");
    return timers;
  });

  srv.on("start", Timers, (req) => {
    LOG.info("start timer");
  });

  srv.on("stop", Timers, (req) => {
    LOG.info("start timer");
  });

  srv.on("getStatus", Timers, (req) => {
    LOG.info("get timer Status");
  });

  srv.on("getCdsModels", () => {
    return {
      Tasks: Tasks,
      Timers: Timers,
    };
  });

  function dispatching() {
    LOG.log("dispatching");
  }

  // post init logic
  LOG.log("post init");
  // read timers state from db
  // restore state from db
  // persist state into db
};
