namespace sap.logm.db;

entity Tasks {
  key ID    : Integer;
      title : String;
}

entity Timers {
  key instanceId : String(30)
}
