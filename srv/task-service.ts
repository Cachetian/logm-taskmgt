import { Service } from "@sap/cds/apis/services";
import cds from "@sap/cds";
export = (srv: Service) => {
  /**
   * pre initialize memeber logic of task service
   */
  function initMemebers(globalMembers: Map<String, Object>): void {
    let timers = [{ instanceId: 0 }];
    globalMembers.set("timers", timers);
  }

  /**
   * post initialize logic of task service
   */
  function postInit(): void {
    // read timers state from db
    // restore state from db
    // persist state into db
  }

  function dispatching(): void {
    LOG.log("dispatching");
  }

  const LOG = cds.log("sap.logm.srv.TaskService");
  const { Tasks, Timers } = srv.entities;
  const globalMembers: Map<String, Object> = new Map();

  // init global members
  LOG.log("init memebers");
  initMemebers(globalMembers);

  srv.on("READ", Timers, (req) => {
    LOG.info("Get timers");
    return globalMembers.get("timers");
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

  srv.on("getStatus", Timers, (req) => {
    LOG.info("get timer Status");
  });

  srv.on("pushToTaskQueue", (req) => {
    LOG.info("pushToTaskQueue");
  });

  srv.on("readStatus", (req) => {
    LOG.info("readStatus");
  });

  srv.on("retrieveLogModelData", (req) => {
    LOG.info("retrieveLogModelData");
  });

  srv.on("deleteConsumedLogModelData", (req) => {
    LOG.info("deleteConsumedLogModelData");
  });
  
  // post init logic
  LOG.log("post init");
  postInit();
};
