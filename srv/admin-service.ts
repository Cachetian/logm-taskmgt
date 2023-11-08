import { Service } from "@sap/cds/apis/services";
import cds from "@sap/cds";

export = (srv: Service) => {
  const LOG = cds.log("sap.logm.srv.admin");

  srv.before("*", (req) =>
    LOG.info("before generic handler -> req.event: ", req.event)
  );

  srv.on("getProcessEnv", () => {
    return process.env;
  });

  srv.on("getCfAppInstanceIndex", () => {
    let instanceIndex: string = process.env.CF_INSTANCE_INDEX;
    return instanceIndex || "0";
  });

  srv.on("getCdsService", () => {
    return srv;
  });

  srv.on("getCdsEnvKeys", () => {
    return Object.keys(cds.env);
  });

  srv.on("getCdsEnv", (req) => {
    LOG.info("req.data.path:", req.data.path);
    if (req.data.path === "*") {
      return cds.env;
    }
    type CdsEnvKey = keyof typeof cds.env;
    let path: CdsEnvKey = req.data.path as CdsEnvKey;
    return cds.env[path];
  });

  srv.on("getCdsModels", () => {
    return {};
  });
};
