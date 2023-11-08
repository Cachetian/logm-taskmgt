import { Service } from "@sap/cds/apis/services";
import cds from "@sap/cds";
import { setTimeout } from "timers/promises";

export = (srv: Service) => {
  const LOG = cds.log("sap.logm.srv.devl");

  srv.before("*", (req) =>
    LOG.info("before generic handler -> req.event: ", req.event)
  );

  srv.on("parseChunkSim", async (req) => {
    LOG.info("parseChunkSim - ", req.event, req.data);
    await setTimeout(2000, "result");
    LOG.info("parsing 20%");
    await setTimeout(2000, "result");
    LOG.info("parsing 40%");
    await setTimeout(2000, "result");
    LOG.info("parsing 60%");
    await setTimeout(2000, "result");
    LOG.info("parsing 80%");
    await setTimeout(2000, "result");
    LOG.info("parse done");
    return {
      results: [
        {
          timestamp: new Date().getTime(),
          logger: "a.b",
          level: "info",
          thread: "a",
          message: "this is a dummy 1"
        },
        {
          timestamp: new Date().getTime(),
          logger: "a.b",
          level: "info",
          thread: "a",
          message: "this is a dummy 2"
        }
      ]
    };
  });
};
