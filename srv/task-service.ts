import { Service } from "@sap/cds/apis/services";
import cds from "@sap/cds";
import { setTimeout } from "timers";

/**
 * Task service
 */
export = async (srv: Service) => {
  //
  // Declare design time types, static members
  //
  const LOG = cds.log("sap.logm.srv.TaskService");
  const { Tasks, Timers } = srv.entities;
  const globalMembers: Map<String, Object> = new Map();

  //
  // Declare design time functions
  //

  /**
   * pre initialize memeber logic of task service
   */
  async function initMemebers(
    globalMembers: Map<String, Object>
  ): Promise<void> {
    LOG.log("init memebers");
    let timers = [{ instanceId: 0 }];
    let serviceState: String = "Idle";
    let settings: Map<String, Object> = new Map([
      ["heartBeatIntervalMillionSeconds", 10000],
      ["taskQueueCapacity", 16]
    ]);
    let runtimeData: Map<String, Object> = new Map();
    let timeoutId: NodeJS.Timeout = null;
    globalMembers.set("runtimeData", runtimeData);
    globalMembers.set("settings", settings);
    runtimeData.set("timers", timers);
    runtimeData.set("serviceState", serviceState);
    runtimeData.set("timeoutId", timeoutId);

    // restore timers from db
    // if no timer status found in db
    timeoutId = setTimeout(
      onTechnicalTimeout,
      Number(settings.get("heartBeatIntervalMillionSeconds"))
    );
    // restore business state of the service

    // restore tasks from db?
    let tasks = await cds.read(Tasks);
    if (tasks.length === 0) {
      LOG.log("No task restored");
    } else {
      LOG.log("Found tasks records: ", tasks.length);
    }
    // if no tasks data from db, init task data into db.
  }

  //
  // Utils
  //

  function getRuntimeParam(param: String): Object {
    let runtimeData: Map<String, Object> = globalMembers.get(
      "runtimeData"
    ) as Map<String, Object>;
    return runtimeData.get(param);
  }

  function setRuntimeParam(param: String, value: Object): Object {
    let runtimeData: Map<String, Object> = globalMembers.get(
      "runtimeData"
    ) as Map<String, Object>;
    return runtimeData.set(param, value);
  }

  function getGlobalSetting(param: String): Object {
    let settings: Map<String, Object> = globalMembers.get("settings") as Map<
      String,
      Object
    >;
    return settings.get(param);
  }

  async function genEmptyTasks() {
    let tasks = [];
    let capacity: number = Number(getGlobalSetting("taskQueueCapacity"));
    for (let i = 0; i < capacity; i++) {
      const task = {
        ID: i
      };
      tasks.push(task);
    }
    await INSERT.into(Tasks).entries(tasks);
  }

  //
  // Lifecycle
  //

  /**
   * post initialize logic of task service
   */
  function postInit(): void {
    LOG.log("post init");
    // read timers state from db
    // restore state from db
    // persist state into db
  }

  async function dispatching(): Promise<void> {
    LOG.log("dispatching");
    await setTimeout(() => {}, 200);
    onQueueEmpty();
  }

  async function loading(): Promise<void> {
    LOG.log("loading");
  }

  async function onInitComplete(): Promise<void> {
    LOG.log("onInitComplete");
    await dispatching();
  }

  function onQueueEmpty(): void {
    LOG.log("onQueueEmpty");
  }

  function onStopAction(): void {
    LOG.log("onStopAction");
  }

  function onTaskArrival(): void {
    LOG.log("onTaskArrival");
  }

  function onTechnicalTimeout(): void {
    // if business heart beat still requires
    onHeartBeat();
  }

  function onHeartBeat(): void {
    LOG.log("onHeartBeat");
    // if idle, set next heart beat.
    let serviceState: String = getRuntimeParam("serviceState") as String;
    if (serviceState === "Idle") {
      let timeoutId = setTimeout(
        onTechnicalTimeout,
        Number(getGlobalSetting("heartBeatIntervalMillionSeconds"))
      );
      setRuntimeParam("timeoutId", timeoutId);
    }
  }

  function onChunkProcessComplete(): void {
    LOG.log("onChunkProcessComplete");
  }

  function onStatusUpdateComplete(): void {
    LOG.log("onStatusUpdateComplete");
  }

  async function onLoadComplete(): Promise<void> {
    LOG.log("onLoadComplete");
    let devService = await cds.connect.to("sap.logm.srv.DevService");
    devService.emit("parseChunkSim", {});
    // set to Busy
  }

  //
  // Declare runtime time functions
  //

  // init global members
  initMemebers(globalMembers);

  srv.before("CREATE", Tasks, (req) => {
    LOG.info("Before CREATE Tasks");
  });

  srv.on("READ", Timers, (req) => {
    LOG.info("Get timers - ", req.event);
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

  srv.on("getStatus", (req) => {
    LOG.info("getStatus");
    return getRuntimeParam("serviceState");
  });

  srv.on("pushToTaskQueue", async (req) => {
    LOG.info("pushToTaskQueue - ", req.data);
    let tasks: Array<Object> = [];
    let { logFileChunks, fileName, logType, fileId } = req.data;
    if (fileId === null || fileId === "") {
      fileId = new Date().getTime();
    }

    // get tasks data
    for (let i = 0; i < logFileChunks.length; i++) {
      const chunk = logFileChunks[i];
      let task = {
        fileName: fileName,
        logType: logType,
        fileId: fileId
      };
      tasks.push(task);
    }
    // persist into db
    await srv.send("POST", "/Tasks", tasks);
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
  postInit();
  onInitComplete();
};
