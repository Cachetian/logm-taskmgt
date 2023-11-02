namespace sap.logm.srv;

using sap.logm.db as db from '../db/data-model';

service TaskService {
    entity Tasks  as projection on db.Tasks;

    entity Timers as projection on db.Timers actions {
        action start();
        action stop();
        action getStatus() returns String;
    }

    /**
     * Push as file into task queue for parsing.
     */
    action pushToTaskQueue(parseCallback : String, fileName : String, logType : String, logFileChunks : array of String, fileId : String) returns String;
    /**
     * read file parsing status by ID
     */
    action readStatus(fileId : String)                                                                                                    returns String;
    /**
     * retrieve log model data from task map.
     */
    action retrieveLogModelData(fileId : String, ifDeleteAfterRetrieve : Boolean)                                                         returns String;
    /**
     * delete consumed log model data from task map.
     */
    action deleteConsumedLogModelData(fileId : String);
}
