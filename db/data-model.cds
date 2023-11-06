namespace sap.logm.db;

using {cuid} from '@sap/cds/common';

entity Tasks : cuid {
  taskNo              : Integer;
  title               : String;
  status              : String enum {
    Queuing = 'Queuing';
    Pulling = 'Pulling';
    Parsing = 'Parsing';
    Putting = 'Putting';
    Ready   = 'Ready';
  };
  parsed              : Boolean;
  fileId              : String;
  leadingChunk        : Boolean;
  lastChunk           : Boolean;
  fileName            : String;
  logType             : String;
  nextChunk           : Association to one Tasks;
  fileChunkData       : Association to one TaskLogFileChunkData;
  fileChunkDataLength : Integer;
  logModelData        : Association to one TaskLogModelData;
  logModelDataLength  : Integer;
}

entity TaskLogFileChunkData {
  key task             : Association to one Tasks;
      originalLength   : Integer;
      logFileChunkData : LargeBinary;
}

entity TaskLogModelData {
  key task           : Association to one Tasks;
      originalLength : Integer64;
      logModelData   : LargeString;
}


entity Timers {
  key instanceId : String(30);
      status     : State;
}

type State : String enum {
  Initializing = 'Initializing';
  Dispatching  = 'Dispatching';
  Idle         = 'Idle';
  Busy         = 'Busy';
  Loading      = 'Loading';
}
