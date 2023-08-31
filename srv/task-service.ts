import { Service } from "@sap/cds/apis/services";
import { Tasks } from '#cds-models/sap/logm/db';

export = (srv: Service) => {
  const { Tasks } = srv.entities;
};
