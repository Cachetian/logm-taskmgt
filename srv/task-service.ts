import { Service } from "@sap/cds/apis/services";
import cds from "@sap/cds";
import { Task } from "#cds-models/sap/logm/db";
const { uuid } = cds.utils;
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

  type TaskWithChunkData = {
    ID: String;
    taskNo: Number;
    fileName: String;
    logType: String;
    fileId: String;
    chunkData: String;
  };

  /**
   * pre initialize memeber logic of task service
   */
  async function initMemebers(
    globalMembers: Map<String, Object>
  ): Promise<void> {
    LOG.info("init memebers");
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
    // create timer in db
    let timer = await cds.read(Timers).where({
      instanceId: getCfAppInstanceIndex()
    });
    if (!timer) {
      await createTimer();
    }
    timeoutId = setTimeout(
      onTechnicalTimeout,
      Number(settings.get("heartBeatIntervalMillionSeconds"))
    );
    // restore business state of the service

    // restore tasks from db?
    let tasks = await cds.read(Tasks);
    if (tasks.length === 0) {
      LOG.info("No task restored");
    } else {
      LOG.info("Found tasks records: ", tasks.length);
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

  function getCfAppInstanceIndex() {
    let instanceIndex: string = process.env.CF_INSTANCE_INDEX;
    return instanceIndex || "0";
  }

  //
  // Lifecycle
  //

  /**
   * post initialize logic of task service
   */
  function postInit(): void {
    LOG.info("post init");
    // read timers state from db
    // restore state from db
    // persist state into db
  }

  async function dispatching(): Promise<void> {
    LOG.info("dispatching");
    await setTimeout(() => {}, 200);
    // check task queue status
    let taskQueue = await SELECT.one
      .from("sap.logm.db.Tasks")
      .columns("count(*)").where`parsed != TRUE`.orderBy`taskNo, taskNo desc`;
    if (taskQueue.count > 0) {
      let task = await SELECT.one.from("sap.logm.db.Tasks")
        .where`parsed != TRUE`.orderBy`taskNo, taskNo desc`.limit(1);
      if (task) {
        setRuntimeParam("peekTask", task);
        loading();
      }
    } else {
      onQueueEmpty();
    }
    // if task queue not empty, pulling one task from queue for loading and parsing
    // if task queue is empty, trigger queue empty for set status to idle
  }

  async function loading(): Promise<void> {
    LOG.info("loading");
    let task: Task = getRuntimeParam("peekTask");
    let taskChunkData = await SELECT.one
      .from("sap.logm.db.TaskLogFileChunkData")
      .columns("logFileChunkData").where`task_ID = ${task.ID}`;
    setRuntimeParam("taskLogFileChunkData", taskChunkData.logFileChunkData);
    LOG.info("load chunk data len - ", taskChunkData.logFileChunkData.length);
    onLoadComplete();
  }

  async function onInitComplete(): Promise<void> {
    LOG.info("onInitComplete");
    await cds.update(Timers).where({
      instanceId: getCfAppInstanceIndex()
    }).set`status = 'Dispatching'`;
    await dispatching();
  }

  async function onQueueEmpty(): Promise<void> {
    LOG.info("onQueueEmpty");
    await cds.update(Timers).where({
      instanceId: getCfAppInstanceIndex()
    }).set`status = 'Idle'`;
  }

  function onStopAction(): void {
    LOG.info("onStopAction");
  }

  async function onTaskArrival(): Promise<void> {
    LOG.info("onTaskArrival");
    // get timer by app ID, get status, check status if busy
    // if from idle to busy, set status to busy, pulling one task from queue, stop heart beat
    let timerForStatus = await cds.read(Timers).where({
      instanceId: getCfAppInstanceIndex()
    });
    if (timerForStatus[0].status === "Idle") {
      await cds.update(Timers).where({
        instanceId: getCfAppInstanceIndex()
      }).set`status = 'Busy'`;
      let task = await SELECT.one.from("sap.logm.db.Tasks")
        .where`parsed != TRUE`.orderBy`taskNo, taskNo desc`.limit(1);
      if (task) {
        setRuntimeParam("peekTask", task);
        loading();
      }
    }
    // if already busy, do nothing, log message: already busy.
    else {
      LOG.info("Already busy - ", timerForStatus);
    }
  }

  function onTechnicalTimeout(): void {
    // if business heart beat still requires
    onHeartBeat();
  }

  function onHeartBeat(): void {
    LOG.info("onHeartBeat");
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

  async function onChunkProcessComplete(): Promise<void> {
    LOG.info("onChunkProcessComplete");
    // set status
    await cds.update(Timers).where({
      instanceId: getCfAppInstanceIndex()
    }).set`status = 'Dispatching'`;
    dispatching();
  }

  function onStatusUpdateComplete(): void {
    LOG.info("onStatusUpdateComplete");
  }

  async function onLoadComplete(): Promise<void> {
    LOG.info("onLoadComplete");
    // set to Busy
    await cds.update(Timers).where({
      instanceId: getCfAppInstanceIndex()
    }).set`status = 'Busy'`;
    parseChunk();
  }

  function loadChunkData() {}

  async function parseChunk() {
    // get chunk data from db
    // call parse callback
    // save result into db
    let task: Task = getRuntimeParam("peekTask");
    let taskLogFileChunkData = getRuntimeParam("taskLogFileChunkData");
    let devService = await cds.connect.to("sap.logm.srv.DevService");
    await devService.emit("parseChunkSim", {
      chunk: taskLogFileChunkData,
      fileName: task.fileName,
      logType: task.logType
    });
    await cds.update(Tasks).where({
      ID: task.ID
    }).set`parsed = TRUE`;
    onChunkProcessComplete();
  }

  //
  // CURD customization
  //
  async function createTasks(tasks: Array<Object>) {
    await INSERT.into(Tasks).entries(tasks);
  }

  /***
   * Create task header
   * Create each chunks data - time consumping
   */
  async function createTasksWithChunkData(tasks: Array<TaskWithChunkData>) {
    // get last task number
    let countResut = await SELECT.from("sap.logm.db.Tasks").columns("count(*)");
    LOG.debug("Last count: ", countResut);
    let lastCount = countResut[0].count;
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      task.taskNo = lastCount + i;
    }

    // create tasks
    await INSERT.into("sap.logm.db.Tasks").entries(tasks);

    // create chunks data
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      let chunkData = task.chunkData;
      let taskLogFileChunkData = {
        task_ID: task.ID,
        originalLength: chunkData.length,
        logFileChunkData: chunkData
      };
      // time consuming task, this could take 10+ seconds.
      await INSERT.into("sap.logm.db.TaskLogFileChunkData").entries(
        taskLogFileChunkData
      );
      await UPDATE`sap.logm.db.Tasks`.with({
        fileChunkData_ID: task.ID, //>  simple value
        fileChunkDataLength: chunkData.length //>  qbe expression
      }).where`ID=${task.ID}`;
    }
    LOG.debug("Created tasks: ", tasks.length);
  }

  async function createTimer() {
    // get
    let instanceIndex: string = process.env.CF_INSTANCE_INDEX || "0";
    await INSERT.into("sap.logm.db.Timers").entries({
      instanceId: instanceIndex,
      status: "Initializing"
    });
  }

  //
  // Declare runtime time functions
  //

  // init global members
  initMemebers(globalMembers);

  srv.before("CREATE", Tasks, (req) => {
    LOG.info("Before CREATE Tasks - ", req.event, req.entity, req.query);
  });

  // srv.on("READ", Timers, (req) => {
  //   LOG.info("Get timers - ", req.event);
  //   return globalMembers.get("timers");
  // });

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
    // validation if task queue is full

    // pushing task data into queue
    LOG.info("pushToTaskQueue - ", req.data);
    let tasks: Array<TaskWithChunkData> = [];
    let { logFileChunks, fileName, logType, fileId } = req.data;

    // check fileId
    if (fileId === null || fileId === "") {
      fileId = uuid().toString().substring(0, 6);
    }

    // get tasks data from request
    for (let i = 0; i < logFileChunks.length; i++) {
      const chunkData = logFileChunks[i];
      let task: TaskWithChunkData = {
        ID: "",
        taskNo: 0,
        fileName: fileName,
        logType: logType,
        fileId: fileId,
        chunkData: chunkData
      };
      tasks.push(task);
      // test code for consume CRUD generic handler directly instead of execute SQL
      // await srv.send("POST", "/Tasks", task);
      // await srv.emit("CREATE", task);
    }
    LOG.debug("Found chunks:", tasks.length);
    await createTasksWithChunkData(tasks);
    // persist into db
    // test code for consume CRUD generic handler directly instead of execute SQL
    // await srv.send("POST", "/Tasks", tasks);
    // await srv.emit("CREATE", tasks);
    onTaskArrival();
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
