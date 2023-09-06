import { Service } from "@sap/cds/apis/services";
import { Tasks, Timers } from "#cds-models/sap/logm/db";

export = (srv: Service) => {
  srv.on("READ", "Timers", (req) => {
    return [{ instanceId: "1" }];
  });
};
