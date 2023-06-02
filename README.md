# local-data
This project allows anyone to connect Optuma to a data service that Optuma does not support directly. Because nearly every data source has their own format, there needs to be an interpreter that can speak both the Optuma and data provider language. This Node server can be used as the interpreter.

On start-up, Optuma will serach for any local-data configuration files. The configuration contains all the information that Optuma needs to connect to the local Node server. Optuma will also create a custom folder in the Security Selector but the Node server should be able to accept all Optuma securities and translate those too.



## Instalation
### Download Node Server
