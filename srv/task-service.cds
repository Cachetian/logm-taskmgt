namespace sap.logm.srv;

using sap.logm.db as db from '../db/data-model';

service TaskService {
    entity Tasks as projection on db.Tasks;
}
