namespace sap.logm.db;

entity Tasks {
  key ID            : Integer;
      title         : String;
      parsed        : Boolean;
      fileId        : String;
      leadingChunk  : Boolean;
      fileName      : String;
      logType       : String;
      nextChunk     : Association to one Tasks;
      fileChunkData : Association to one TaskLogFileChunkData;
      logModelData  : Association to one TaskLogModelata;
}

entity TaskLogFileChunkData {
  key task             : Association to one Tasks;
      originalLength   : Integer;
      logFileChunkData : LargeBinary;
}

entity TaskLogModelata {
  key task           : Association to one Tasks;
      originalLength : Integer64;
      logModelData   : LargeString;
}


entity Timers {
  key instanceId : String(30)
}

type State : String enum {
  Dispatching = 'Dispatching';
  Idle        = 'Idle';
  Busy        = 'Busy';
  Loading     = 'Loading';
}
