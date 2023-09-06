namespace sap.logm.srv;

using sap.logm.db as db from '../db/data-model';

service TaskService {
    entity Tasks  as projection on db.Tasks;

    entity Timers as projection on db.Timers actions {
        action start();
        action stop();
        action getStatus() returns String;
    }
}
