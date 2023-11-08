import { Service } from "@sap/cds/apis/services";
import cds from "@sap/cds";
import { Task, Timer } from "#cds-models/sap/logm/db";
const { uuid } = cds.utils;
import { setTimeout } from "timers";

/**
 * Task service
 */
export = async (srv: Service) => {
  //
  // Declare design time types, static members
  //
  const LOG = cds.log("sap.logm.srv.task");
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
  async function preInit(globalMembers: Map<String, Object>): Promise<void> {
    LOG.info("Pre initialization");
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

  function getInstanceId() {
    let instanceIndex: string = process.env.CF_INSTANCE_INDEX;
    return instanceIndex || "0";
  }

  async function getCurrentTimer(): Promise<Timer> {
    return await cds.read(Timers, getInstanceId());
  }

  async function setTimerStatus(status: String) {
    await cds.update(Timers, getInstanceId()).set({ status: status });
    LOG.debug("Status set to", status);
    // Veify update result
    // let timer = await getCurrentTimer();
    // LOG.debug("Status is:", timer.status);
  }

  async function generateTaskNo(): Promise<number> {
    let taskTotalCount = await SELECT.one
      .from("sap.logm.db.Tasks")
      .columns("count(*)");
    return taskTotalCount.count;
  }

  //
  // Lifecycle
  //

  /**
   * post initialize logic of task service
   */
  async function postInit(): Promise<void> {
    LOG.info("Post initialization");
    // read timers state from db
    // restore state from db
    // persist state into db
    // restore timers from db
    // if no timer status found in db
    // create timer in db
    LOG.debug("Restoring timer from DB");
    let timer = await getCurrentTimer();
    if (!timer) {
      await createTimer();
    }

    // restore tasks from db?
    LOG.debug("Restoring tasks from DB");
    let tasks = await cds.read(Tasks).where`parsed != TRUE`;
    if (tasks.length === 0) {
      LOG.info("No task restored");
    } else {
      LOG.info("Found tasks records: ", tasks.length);
    }
    // if no tasks data from db, init task data into db.
  }

  async function dispatching(): Promise<void> {
    LOG.info("Doing dispatching");
    // check task queue status
    // if task queue not empty, pulling one task from queue for loading and parsing
    // if task queue is empty, trigger queue empty for set status to idle
    let taskQueueForCount = await SELECT.one
      .from("sap.logm.db.Tasks")
      .columns("count(*)").where`parsed != TRUE`;
    if (taskQueueForCount.count > 0) {
      LOG.info("Found and picking up queuing task");
      let task = await SELECT.one.from("sap.logm.db.Tasks")
        .where`parsed != TRUE`.orderBy`taskNo, taskNo desc`.limit(1);
      if (task) {
        LOG.info("Peek task found, taskNo:", task.taskNo);
        setRuntimeParam("peekTask", task);
        loading();
      }
    } else {
      srv.emit("QueueEmpty");
    }
  }

  async function loading(): Promise<void> {
    LOG.info("Doing loading");
    await loadChunkData();
    onLoadComplete();
  }

  async function handleInitComplete(): Promise<void> {
    LOG.info("On InitComplete");
    setTimerStatus("Dispatching");

    await dispatching();
  }

  async function handleQueueEmpty(): Promise<void> {
    LOG.info("On QueueEmpty");
    setTimerStatus("Idle");
    // start heart beat
    LOG.info("Resume heart beat");
    let timeoutId = setTimeout(
      onTechnicalTimeout,
      Number(getGlobalSetting("heartBeatIntervalMillionSeconds"))
    );
    setRuntimeParam("timeoutId", timeoutId);
  }

  function onStopAction(): void {
    LOG.info("onStopAction");
  }

  async function handleTaskArrival(): Promise<void> {
    LOG.info("handleTaskArrival");
    // get timer by app ID, get status, check status if busy
    // if from idle to busy, set status to busy, pulling one task from queue, stop heart beat
    let timerForStatus = await getCurrentTimer();
    if (timerForStatus && timerForStatus.status === "Idle") {
      // stop heart beat
      let timeoutId: NodeJS.Timeout = getRuntimeParam(
        "timeoutId"
      ) as NodeJS.Timeout;
      LOG.debug("Pause heart beat");
      clearTimeout(timeoutId);
      setTimerStatus("Busy");
      let task = await SELECT.one.from("sap.logm.db.Tasks")
        .where`parsed != TRUE`.orderBy`taskNo, taskNo desc`.limit(1);
      if (task) {
        setRuntimeParam("peekTask", task);
        loading();
      }
    }
    // if already busy, do nothing, log message: already busy.
    else {
      LOG.info(
        "Do nothing, already busy. current status",
        timerForStatus.status
      );
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
      instanceId: getInstanceId()
    }).set`status = 'Dispatching'`;
    dispatching();
  }

  function onStatusUpdateComplete(): void {
    LOG.info("onStatusUpdateComplete");
  }

  async function onLoadComplete(): Promise<void> {
    LOG.info("onLoadComplete");
    // set to Busy
    setTimerStatus("Busy");
    parseChunk();
  }

  async function loadChunkData() {
    let task: Task = getRuntimeParam("peekTask");
    let taskChunkData = await SELECT.one
      .from("sap.logm.db.TaskLogFileChunkData")
      .columns("logFileChunkData").where`task_ID = ${task.ID}`;
    setRuntimeParam("taskLogFileChunkData", taskChunkData.logFileChunkData);
    LOG.info("Load chunk data len - ", taskChunkData.logFileChunkData.length);
  }

  async function parseChunk() {
    LOG.info("Parse chunk data");
    // get chunk data from db
    // call parse callback
    // save result into db
    let task: Task = getRuntimeParam("peekTask");
    let taskLogFileChunkData = getRuntimeParam("taskLogFileChunkData");
    let devService = await cds.connect.to("sap.logm.srv.DevService");
    let logModelData = await devService.emit("parseChunkSim", {
      chunk: taskLogFileChunkData,
      fileName: task.fileName,
      logType: task.logType
    });
    await cds.update(Tasks).where({
      ID: task.ID
    }).set`parsed = TRUE`;
    let taskLogFleModelData = {
      task_ID: task.ID,
      logModelData: logModelData
    };
    await INSERT.into("sap.logm.db.TaskLogModelData").entries(
      taskLogFleModelData
    );

    // Putting
    // put result map, if last chunk, read all chunks by fileId
    // if (task.lastChunk) {
    //   let taskIds = await SELECT.from("sap.logm.db.Tasks").columns("ID").where({
    //     fileId: task.fileId
    //   }).orderBy`taskNo, taskNo desc`;
    //   let logFileAllModelsData = [];
    //   for (let i = 0; i < taskIds.length; i++) {
    //     const taskId = taskIds[i];
    //     let logFileModelData = await SELECT.one
    //       .from("sap.logm.db.TaskLogModelData")
    //       .columns("logFileChunkData").where`task_ID = ${taskId}`;
    //     logFileAllModelsData.push(logFileModelData);
    //   }
    //   await INSERT.into("sap.logm.db.TaskLogModelData").entries(
    //     logFileAllModelsData
    //   );
    // }

    // save to result map
    onChunkProcessComplete();
  }

  //
  // CURD customization
  //
  async function createTasks(tasks: Array<Object>) {
    await INSERT.into(Tasks).entries(tasks);
  }

  /***
   * Create task header and create each chunks data - time consumping
   */
  async function createTasksWithChunkData(tasks: Array<TaskWithChunkData>) {
    // get last task number
    let lastCount = await generateTaskNo();
    LOG.debug("Last count: ", lastCount);
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      task.taskNo = lastCount + i;
    }

    // create tasks
    await INSERT.into("sap.logm.db.Tasks").entries(tasks);
    LOG.debug("Created tasks headers, count: ", tasks.length);

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
      LOG.debug("Created tasks chunk data, len: ", chunkData.length);
    }
    LOG.debug("Created tasks: ", tasks.length);
  }

  async function createTimer() {
    // get
    let instanceIndex: string = process.env.CF_INSTANCE_INDEX || "0";
    srv.insert(Timers).entries({
      instanceId: instanceIndex,
      status: "Initializing"
    });
  }

  //
  // Declare runtime time functions
  //

  // init global members
  preInit(globalMembers);

  srv.before("CREATE", Tasks, (req) => {
    LOG.info("Before CREATE Tasks - ", req.event, req.entity, req.query);
  });

  srv.on("start", Timers, (req) => {
    LOG.info("start timer");
  });

  srv.on("stop", Timers, (req) => {
    LOG.info("start timer");
  });

  srv.on("getStatus", Timers, async (req) => {
    LOG.info("Get timer status. req.query:", req.query);
    let timer = await cds.run(req.query);
    return timer[0].status;
  });

  srv.on("getStatus", (req) => {
    LOG.info("getStatus");
    return getRuntimeParam("serviceState");
  });

  srv.on("pushToTaskQueue", async (req) => {
    // validation if task queue is full
    // if not parsed tasks count less than capacity
    let taskQueueForCount = await SELECT.one
      .from("sap.logm.db.Tasks")
      .columns("count(*)").where`parsed != TRUE`;
    let taskQueueCapacity: number = Number(
      getGlobalSetting("taskQueueCapacity")
    );
    if (taskQueueForCount.count >= taskQueueCapacity) {
      return req.error(
        "419",
        "Task queue is full, capacity is: ",
        taskQueueCapacity
      );
    }

    // pushing task data into queue
    LOG.info("Push To Task Queue - ", req.data);
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
    }
    LOG.debug("Found chunks:", tasks.length);
    await createTasksWithChunkData(tasks);

    // persist into db
    srv.emit("TaskArrival");
  });

  srv.on("readStatus", async (req) => {
    LOG.info("readStatus");
  });

  srv.on("retrieveLogModelData", (req) => {
    LOG.info("retrieveLogModelData");
  });

  srv.on("deleteConsumedLogModelData", (req) => {
    LOG.info("deleteConsumedLogModelData");
  });

  srv.on("InitComplete", handleInitComplete);

  srv.on("QueueEmpty", handleQueueEmpty);

  srv.on("TaskArrival", handleTaskArrival);

  // post init logic
  postInit();
  srv.emit("InitComplete");
};
