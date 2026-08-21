import { DeploymentEnvironment } from '@environmentModel';

type ProductionDomainName = 'ams.ictu.vn';

type DevelopmentServers = 'server_dev' | 'server_online';

export const DEPLOYMENTS_FOR_DEV : Record<DevelopmentServers , DeploymentEnvironment> = {
    'server_dev'    : new DeploymentEnvironment( {
        apiServiceConfig    : {
            title                                : 'Hệ thống quản lý tuyển sinh' ,
            realm                                : 'tuyensinhv3' ,
            port                                 : 10091 ,
            googleClientId                       : '196027039836-kjhoo8f8p3i2eldcodouvs94p1gbi4jo.apps.googleusercontent.com' ,
            protocol                             : 'https' ,
            X_APP_ID                             : 'FA3D8DB6-8B75-43BA-A73C-3540EE55F55B' , // app của Đức
            client                               : 'ictu' ,
            enableSignInWithGoogle               : true ,
            enableSignInWithMicrosoft            : true ,
            synchronization_time                 : 30 ,
            privateKey                           : 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo71Bopp9KVV4jhZve6G65bMT5JG05GFC21PUtjsgmOlTb5Z8XwKSiPsK0Ohf0rH7V3mAd+9gCnPM2MS+/rRjaTnOKXX8HOTHeW1Glhb38QP14kgS8xsfzLQMrT87VgzAfJpBYJiuKjAocb7KUzXZVYJp9mjjsG0S+dbcPlQs4p4nBkthONKf5tfK1oGPgi+LvaOnl6KC44NHPZSLQiqwkRe4cmr3zYwjSX60W3kZwzig3j+FtzY4R2LKx9N+rLlN/g32B/EP7FnxKKTvBIxtgQM9x7wYkE4a2ziQtzt/SHcdrJLVsXhpaXIcd6cXf+qpXnx9ihBsRfY+t47tDZnXwIDAQAB' ,
            enableConstructionMode               : false ,
            enableTestingMode                    : true ,
            listOfRestrictedFileTypesForDownload : [ 'pdf' , 'video' , 'audio' , 'text' , 'image' ] ,
            domainName                           : 'api-dev.ictu.vn' ,
            fileHostingService                   : 'local'
        } ,
        socketServiceConfig : {
            port : 10092 ,
            path : '/sso/socket'
        }
    } ) ,
    'server_online' : new DeploymentEnvironment( {
        apiServiceConfig    : {
            title                                : 'Hệ thống quản lý tuyển sinh' ,
            realm                                : 'dttx' ,
            port                                 : 9081 ,
            googleClientId                       : '973389896263-11sa03rtspsn2fap5uo160l3opa7n62t.apps.googleusercontent.com' ,
            protocol                             : 'https' ,
            X_APP_ID                             : 'D5006F80-F239-4FBD-9D48-91EE3B1ECFD0' ,
            client                               : 'ictu' ,
            enableSignInWithGoogle               : true ,
            enableSignInWithMicrosoft            : true ,
            synchronization_time                 : 30 ,
            privateKey                           : 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo71Bopp9KVV4jhZve6G65bMT5JG05GFC21PUtjsgmOlTb5Z8XwKSiPsK0Ohf0rH7V3mAd+9gCnPM2MS+/rRjaTnOKXX8HOTHeW1Glhb38QP14kgS8xsfzLQMrT87VgzAfJpBYJiuKjAocb7KUzXZVYJp9mjjsG0S+dbcPlQs4p4nBkthONKf5tfK1oGPgi+LvaOnl6KC44NHPZSLQiqwkRe4cmr3zYwjSX60W3kZwzig3j+FtzY4R2LKx9N+rLlN/g32B/EP7FnxKKTvBIxtgQM9x7wYkE4a2ziQtzt/SHcdrJLVsXhpaXIcd6cXf+qpXnx9ihBsRfY+t47tDZnXwIDAQAB' ,
            enableConstructionMode               : false ,
            enableTestingMode                    : true ,
            listOfRestrictedFileTypesForDownload : [ 'pdf' , 'video' , 'audio' , 'text' , 'image' ] ,
            domainName                           : 'https://dttx.ictu.edu.vn' ,
            fileHostingService                   : 'aws'
        } ,
        socketServiceConfig : {
            port : 9082 ,
            path : '/sso/socket'
        }
    } )
}


