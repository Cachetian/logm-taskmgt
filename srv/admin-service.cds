namespace sap.logm.srv;

using sap.logm.db as db from '../db/data-model';

service AdminService {

    function getProcessEnv()       returns String;
    function getCfAppInstanceIndex() returns String;
    function getCdsService()          returns String;
    function getCdsEnvKeys()          returns array of String;
    function getCdsEnv(path : String) returns String;
}
