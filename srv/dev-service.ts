import { Service } from "@sap/cds/apis/services";
import cds from "@sap/cds";

export = (srv: Service) => {
  const LOG = cds.log("sap.logm.srv.DevService");

  srv.before("*", (req) =>
    LOG.info("before generic handler -> req.event: ", req.event)
  );

  srv.on("parseChunkSim", (req) => {
    LOG.info("parseChunkSim: ", req.event);
    return "";
  });
};
