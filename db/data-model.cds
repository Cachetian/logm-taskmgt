namespace sap.logm.db;

entity Tasks {
  key ID    : Integer;
      title : String;
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
