var dao = (function(){
    var instance;	
    function instanceObj() {
        
        this.get = function (table, key, ponsuccessread, ponerror, poncomplete) {
            if (g_indexedDB)
                this.idbget(table, key, ponsuccessread, ponerror, poncomplete);
            else
                this.sqlget(table, key, ponsuccessread, ponerror, poncomplete);
        };

        /*
             * pass in a jsonobject and 
             */
        this.put = function (json, table, key, ponsuccesswrite, ponerror, poncomplete) {

    //    	console.log('Inserting ' + key + ' into table ' + table);

            if ((table == 'ProductCategories2') && (!json.p))
                    json.p = 'PC';

            if (g_indexedDB)
                this.idbput(json, table, key, ponsuccesswrite, ponerror, poncomplete);
            else
                this.sqlput(json, table, key, ponsuccesswrite, ponerror, poncomplete);
        };

        /*
             * pass in a jsonobject and 
             */
        this.putMany = function (items, table, ponsuccesswrite, ponerror, poncomplete) {

    //    	console.log('Inserting ' + key + ' into table ' + table);

            if (g_indexedDB)
                this.idbputMany(items, table, key, ponsuccesswrite, ponerror, poncomplete);
            else
                this.sqlputMany(items, table, key, ponsuccesswrite, ponerror, poncomplete);
        };


        this.index = function (table, key, idx, ponsuccessread, ponerror, poncomplete) {

            if (g_indexedDB)
                this.idbindex(table, key, idx, ponsuccessread, ponerror, poncomplete);
            else
                this.sqlindex(table, key, idx, ponsuccessread, ponerror, poncomplete);
        };


        this.indexsorted = function (table, key, idx, sortidx, ponsuccessread, ponerror, poncomplete) {	
            if (g_indexedDB)
                    //TODO: implement an idbindexsorted then we can implement below. for indexeddb we just call index for now
                this.idbindex(table, key, idx, ponsuccessread, ponerror, poncomplete);
            else
                this.sqlindexsorted(table, key, idx, sortidx, ponsuccessread, ponerror, poncomplete);
        };


        this.cursor = function (table, key, index, ponsuccessread, ponerror, poncomplete) {
            if (g_indexedDB)
                this.idbcursor(table, key, index, ponsuccessread, ponerror, poncomplete);
            else
                this.sqlcursor(table, key, index, ponsuccessread, ponerror, poncomplete);
        };

        this.count = function (table, key, index,  poncomplete, ponerror) {
            if (g_indexedDB)
                this.idbcount(table, key, index,  poncomplete, ponerror);
            else
                this.sqlcount(table, key, index,  poncomplete, ponerror);
        };


        /*
             * The first method called and is opens the database for the page
             */
        this.openDB = function (pdbopened) {
            var isIE = function() {
                var tmp = document.documentMode;
                // Try to force this property to be a string. 
                try{
                        document.documentMode = "";
                } catch(e){
                };
                // If document.documentMode is a number, then it is a read-only property, and so 
                // we have IE 8+.
                // Otherwise, if conditional compilation works, then we have IE < 11.
                // Otherwise, we have a non-IE browser. 
                result = typeof document.documentMode == "number" ? !0 : eval("/*@cc_on!@*/!1");
                // Switch back the value to be unobtrusive for non-IE browsers. 
                try {
                    document.documentMode = tmp;
                }catch(e){
                };
                return result;
            }; 

            g_indexedDB = false;
            if (isIE()) g_indexedDB = true;
            if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)) g_indexedDB = true;

            if (g_indexedDB)
                this.idbopenDB(pdbopened);
            else
                this.sqlopenDB(pdbopened);
        };

        /*
             * d
             */
        this.deleteDB = function (pondbdeleted) {
            var seq = localStorage.getItem('sequenceNumber');
            var seqday = localStorage.getItem('sequenceDay');

            if (g_indexedDB)
                this.idbdeleteDB(pondbdeleted);
            else
                this.sqldeleteDB(pondbdeleted);

            //reset sequence number
            if (seq) localStorage.setItem('sequenceNumber',seq);
            if (seqday) localStorage.setItem('sequenceDay',seqday);
        };

        this.clear = function (table) {
            if (g_indexedDB)
                this.idbclear(table);
            else
                this.sqlclear(table);
        };
        this.deleteItem = function (table, key, idx, ponsuccessread, ponerror, poncomplete) {
            if (g_indexedDB)
                this.idbdeleteItem(table, key, idx, ponsuccessread, ponerror, poncomplete);
            else
                this.sqldeleteItem(table, key, idx, ponsuccessread, ponerror, poncomplete);
        };

        this.clearBasket = function (table, accountID, type, ponerror, poncomplete) {
            if (g_indexedDB)
                this.idbclearBasket(table, accountID, type, ponerror, poncomplete);
            else
                this.sqlclearBasket(table, accountID, type, ponerror, poncomplete);
        };

        /***************** Indexed DB ********************************************************************************
             * this method is used to read the database.
             * to be be consistent for indexeddb and websql we will trigger an event when we have read the data 
             *************************************************************************************************************/
        this.idbget = function (table, key, ponsuccessread, ponerror, poncomplete) {

            //get the local user and enter the userid on the screen
            var objectStore = db.transaction(table).objectStore(table);
            var request = objectStore.get(key);
            request.onerror = function (event) {
                ponerror("No record found");
            };
            request.onsuccess = function (event) {
                if (event.target.result == undefined) {
                    if (ponerror != undefined) 
                            ponerror("No record found");
                } else {
                    if (ponsuccessread != undefined) 
                            ponsuccessread(event.target.result);
                }
            };
        };

        /*
             * pass in a jsonobject and 
             */
        this.idbputMany = function (json, table, key, ponsuccesswrite, ponerror, poncomplete) {

        };

        /*
             * pass in a jsonobject and 
             */
        this.idbput = function (json, table, key, ponsuccesswrite, ponerror, poncomplete) {

            // for index range purposes

            if ('Pricelists' == table)
                    json[g_pricelistSortField] = 'PL:' + json.pl + ';' + g_pricelistSortField.toUpperCase() + ':' + json[g_pricelistSortField];

            var transaction;

            try {
                transaction = db.transaction(table, 'readwrite');
            } catch (err) {
                if (ponerror != undefined) 
                    ponerror("error getting database");
                return;
            }

            transaction.oncomplete = function (event) {
                if (poncomplete != undefined) 
                    poncomplete();
            };

            transaction.onerror = function (event) {
                if (ponerror != undefined) 
                    ponerror(event);
            };

            var objectStore = transaction.objectStore(table);
            json.key = key;
            var request = objectStore.put(json);
            request.onsuccess = function (event) {
                if (ponsuccesswrite != undefined) 
                    ponsuccesswrite();
            };
        };

        this.idbindex = function (table, key, idx, ponsuccessread, ponerror, poncomplete) {



            var transaction = db.transaction(table, "readwrite");
            // Do something when all the data is added to the database.
            transaction.oncomplete = function (event) {
                if (poncomplete != undefined) 
                    poncomplete();
            };

            transaction.onerror = function (event) {
                if (ponerror != undefined) 
                    ponerror(event);
            };

            var noResult = true;

            var objectStore = transaction.objectStore(table);
            var index = objectStore.index(idx);
            var singleKeyRange = IDBKeyRange.only(key);
            index.openCursor(singleKeyRange).onsuccess = function (event) {

                var cursor = event.target.result;
                if (cursor) {

                    noResult = false;

                    // cursor.key is a name, like "Bill", and cursor.value is the whole object.
                    if (ponsuccessread != undefined) 
                            ponsuccessread(cursor.value);
                    cursor['continue']();

                } else if (ponerror && noResult) {

                    ponerror(key);
                }           

            };
        };

        this.idbcursor = function (table, key, index, ponsuccessread, ponerror, poncomplete) {
            var transaction = db.transaction(table, "readwrite");
            // Do something when all the data is added to the database.
            transaction.oncomplete = function (event) {
                if (poncomplete != undefined) 
                    poncomplete();
            };

            transaction.onerror = function (event) {
                if (ponerror != undefined) 
                    ponerror(event);
            };

            var objectStore = transaction.objectStore(table);
            objectStore.dao = this;
            if (key != undefined) {
                var keyfrom = key;
                var keyto = key + '}}}';
                var boundKeyRange = IDBKeyRange.bound(keyfrom, keyto);
                objectStore.openCursor(boundKeyRange).onsuccess = function (event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        //$(document).trigger('rowreadOK',cursor.value);
                        if (ponsuccessread != undefined) 
                            ponsuccessread(cursor.value);
                        cursor['continue']();
                    };
                };
            } else {
                objectStore.openCursor().onsuccess = function (event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        //$(document).trigger('rowreadOK',cursor.value);
                        if (ponsuccessread != undefined) 
                            ponsuccessread(cursor.value);
                        cursor['continue']();
                    };
                };
            };
        };

        /*
             * The first method called and is opens the database for the page
             */
        this.idbopenDB = function (pdbopened) {

            window.indexedDB = window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.indexedDB;
            window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
            window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

            var request = window.indexedDB.open("Core", 14);
            request.onerror = function (event) {
                g_alert("Error opening database");
            };
            request.onupgradeneeded = function (event) {
                db = event.target.result;

                var objectStore;
                try {
                     db.deleteObjectStore("Activities");
                } catch (error) {
                    console.log("Already deleted");
                }
                try {
                    objectStore = db.createObjectStore("Versions", { keyPath: "key" });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    db.deleteObjectStore("Products");
                } catch (error) {
                   console.log("Already deleted");
                }
                try {
                    objectStore = db.createObjectStore("Companies", { keyPath: 'key' });
                    objectStore.createIndex("AccountID", "AccountID", { unique: false });
                    objectStore.createIndex(g_myterritorySortField, g_myterritorySortField, { unique: false });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("Pricelists", { keyPath: "key" });
                    objectStore.createIndex("CategoryName", "cn", { unique: false });
                    objectStore.createIndex(g_pricelistSortField, g_pricelistSortField, { unique: false });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("DisplayFields", { keyPath: "key" });
                    objectStore.createIndex("ID", "ID", { unique: false });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("Options", { keyPath: "key" });
                    objectStore.createIndex("Name", "Name", { unique: false });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("ActivityTypes", { keyPath: "key" });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("Users", { keyPath: "key" });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("Contacts", { keyPath: "key" });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("BasketInfo", { keyPath: "key" });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("CallCycle", { keyPath: "key" });
                    objectStore.createIndex("Week", "Week", { unique: false });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("Discount", { keyPath: "key" });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("DiscountCondition", { keyPath: "key" });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("DiscountValues", { keyPath: "key" });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("ProductCategories2", { keyPath: "key" });
                    objectStore.createIndex("p", "p", { unique: false });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("ProductCategory2Link", { keyPath: "key" });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("Address", { keyPath: "key" });
                    objectStore.createIndex("AccountID", "AccountID", { unique: false });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("Stock", { keyPath: "key" });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("Unsent", { keyPath: "key" });
                } catch (error) {
                    console.log("Already exists");
                }
                try {
                    objectStore = db.createObjectStore("TPM", { keyPath: "key" });
                } catch (error) {
                    console.log("Already exists");
                }                
            };
            request.onsuccess = function (event) {
                db = request.result;
                pdbopened();
            };
        };


        this.idbdeleteDB = function (pondbdeleted) {
            localStorage.clear();
            sessionStorage.clear();
            for (var x = 0; x < db.objectStoreNames.length; x++) {
                var table = db.objectStoreNames.item(x);
                var transaction = db.transaction(table, 'readwrite');
                try {
                    var objectStore = transaction.objectStore(table);
                    objectStore.clear();
                } catch (error) {
                    g_alert(error.toString());
                }
            }
            if (pondbdeleted != undefined) 
                    pondbdeleted();
        };

        this.idbclear = function (table) {
            poncomplete = this.oncomplete;
            var transaction = db.transaction(table, 'readwrite');
            transaction.oncomplete = function (event) {
                if (poncomplete != undefined) 
                    poncomplete();
            };
            var objectStore = transaction.objectStore(table);
            objectStore.clear();

        };

        this.idbdeleteItem = function (table, key, idx, ponsuccessread, ponerror, poncomplete) {
            //poncomplete = this.oncomplete;
            var transaction = db.transaction(table, 'readwrite');

            transaction.oncomplete = function (event) {
                if (poncomplete != undefined) 
                    poncomplete();
            };
            var objectStore = transaction.objectStore(table);

            var request = objectStore.get(key);
            request.onerror = function (event) {
                ponerror("No record found");
            };
            objectStore['delete'](key);
        };

        this.idbclearBasket = function (table, accountID, type, ponerror, poncomplete) {
            var transaction = db.transaction(table, 'readwrite');
            transaction.oncomplete = function (event) {
                if (poncomplete != undefined) 
                    poncomplete();
            };

            var objectStore = transaction.objectStore(table);
            objectStore.dao = this;
            objectStore.openCursor().onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.AccountID == accountID && cursor.value.Type == type) {
                        db.transaction(table, 'readwrite').objectStore(table)['delete'](cursor.value.key);
                    };

                    cursor['continue']();
                };
            };

        };


        /**************************************** Web SQL **********************************************
         * 
         ***********************************************************************************************/
        /*
         * this method is used to read the database.
         * to be be consistent for indexeddb and websql we will trigger an event when we have read the data 
         */
        this.sqlget = function (table, key, ponsuccessread, ponerror, poncomplete) {
            this.db.transaction(function (tx) {
                tx.executeSql('SELECT [json] FROM ' + table + ' where keyf = ?',
                                [key],
                                function (tx, results) {
                                    if (ponsuccessread != undefined) {
                                        try {
                                            ponsuccessread(JSON.parse(results.rows.item(0).json));
                                        } catch (error) {
                                            if (ponerror != undefined) 
                                                    ponerror("No record found");
                                        }
                                    }
                                },
                                function (tx, e) {
                                    if (ponerror != undefined) 
                                            ponerror();
                                });
            });
        };

        /*
         * pass in a jsonobject and 
         */
        this.sqlput = function (item, table, keyf, ponsuccesswrite, ponerror, poncomplete) {
            this.db.transaction(function (tx) {
                var sql = 'INSERT or REPLACE INTO ' + table + '(keyf, json, index1, index2, index3, index4)'
                                        + 'VALUES (?,?,?,?,?,?)';
                tx.executeSql(sql,
                        [keyf, JSON.stringify(item), getsqlIndex1(table, item), getsqlIndex2(table, item), getsqlIndex3(table, item), getsqlIndex4(table, item)],
                        function (tx, results) {
                            if (ponsuccesswrite != undefined) 
                                    ponsuccesswrite();
                        },
                        function (tx, e) {
                            if (ponerror != undefined) 
                                    ponerror(tx, e);
                        });
            });
        };

        /*
         * pass in a jsonobject and 
         */
        this.sqlputMany = function (items, table, ponsuccesswrite, ponerror, poncomplete) {

            var that = this;

            this.db.transaction(function (tx) {   
                $.each(items, function (i, item) {

                    if ((table == 'ProductCategories2') && (!item.p))
                            item.p = 'PC';

                    item.key = dao.getInstance().getKeyField(item, table);

                    if (item.Deleted || item.del) {
                            that.deleteItem(table, item.key, undefined,	undefined, undefined, undefined);
                    }
                    else {	
                            var sql = 'INSERT or REPLACE INTO ' + table + '(keyf, json, index1, index2,index3, index4) VALUES (?,?,?,?,?,?)';
                            tx.executeSql(sql, [item.key, JSON.stringify(item), getsqlIndex1(table, item), getsqlIndex2(table, item), getsqlIndex3(table, item), getsqlIndex4(table, item)]);
                    }
                        });
            },

            function (tx) {
                // error
                //alert('1.Something went wrong: ');
                if (ponerror != undefined) 
                    ponerror(tx);
            });

        };
        
        /*
        * Builds a key field for each table type
        */
        this.getKeyField = function (item, table) {
            var keyf = '';
            switch (table) {
                case "DisplayFields": 
                    keyf = item.SupplierID + item.ID + item.Name;
                    break;
                case "Options": 
                    keyf = item.SupplierID + item.Name;
                    break;
                case "productcategories2": 
                    keyf = item.s + item.c;
                    break;
                case "Tree": 
                    keyf = item.SupplierID + item.TreeID;
                    break;    
            }
            return keyf.trim();
        };

        //todo - turn these into proper functions 
        function getsqlIndex1(table, item) {
            try {                
                switch (table) {
                    case 'productcategories2':
                        return item.p;
                        break;
                    case 'DisplayFields':
                        return item.ID;
                        break;
                    case 'Tree':
                        return item.Group;
                        break;                            
                }
            } catch (error) {
                return '';
            };
        };

        function getsqlIndex2(table, item) {
            try {      	
                switch (table) {
                    case 'productcategories2':
                        return item.ti;
                        break;
                    case 'DisplayFields':
                        return item.SortOrder;
                        break;
                    case 'Tree':
                        return item.ParentTreeID;
                        break;    
                }
            } catch (error) {
                return '';
            };
        };

        function getsqlIndex3(table, item) {   
            try {   
                switch (table) {
                    case 'Tree':
                        return item.SortOrder;
                        break;    
                }        
            } catch (error) {
                return '';
            };
        };

        function getsqlIndex4(table, item) {	
            try {	
                return '';
            } catch (error) {
                return '';
            };
        };

        function getsqlIndex4(table, item) {	
            try {	
                return '';
            } catch (error) {
                return '';
            };
        };

        function checkindex (idx){
            if (idx != 'index1' && idx != 'index2' && idx != 'index3' && idx != 'index4') {   		
                    idx = 'index1'; // index can only be either Index1 or Index2. so default to index1 of not valid
                    console.log('Issue with this index used, defaulting to index1');
            }    
            return idx;
        }; 



        this.sqlindex = function (table, key, idx, ponsuccessread, ponerror, poncomplete) {
            this.db.transaction(function (tx) {
                tx.executeSql('SELECT [json] FROM ' + table + ' where ' + checkindex(idx) + '= ?', [key], function (tx, results) {
                    if (ponsuccessread != undefined) {
                        try {
                            var len = results.rows.length, i;
                            if (!len) {                    		
                                    ponerror(key);
                            }                    	
                            for (i = 0; i < len; i++) {
                                ponsuccessread(JSON.parse(results.rows.item(i).json));
                            }
                            if (poncomplete != undefined) 
                                    poncomplete();
                        } catch (error) {
                            if (ponerror != undefined) 
                                    ponerror("No record found");
                        };
                    };
                });
            });
        };

        this.sqlindexsorted = function (table, key, idx, sortidx, ponsuccessread, ponerror, poncomplete) {
            this.db.transaction(function (tx) {
                tx.executeSql('SELECT [json] FROM ' + table + ' where ' + checkindex(idx) + '= ? order by ' + checkindex(sortidx), [key], function (tx, results) {
                    if (ponsuccessread != undefined) {
                        try {
                            var len = results.rows.length, i;
                            if (!len) {                    		
                                    ponerror(key);
                            }                    	
                            for (i = 0; i < len; i++) {
                                ponsuccessread(JSON.parse(results.rows.item(i).json));
                            }
                            if (poncomplete != undefined) 
                                    poncomplete();
                        } catch (error) {
                            if (ponerror != undefined) 
                                    ponerror("No record found");
                        };
                    };
                });
            });
        };

        this.sqlcount = function (table, key, idx, poncomplete, ponerror) {
            if (idx != 'index1' && idx != 'index2' && idx != 'index3' && idx != 'index4') {   		
                    idx = 'index1'; // index can only be either Index1 or Index2. so default to index1 of not valid
                    console.log('Issue with this index used, defaulting to index1');
            }
            this.db.transaction(function (tx) {
                tx.executeSql('SELECT count(keyf) as cnt FROM ' + table + ' where ' + idx + '= ?', [key], function (tx, results) {
                    if (poncomplete != undefined) {
                        try {                   		
                            var len = results.rows.item(0).cnt;
                            if (len > 0)
                                    poncomplete(len);
                            else
                                    ponerror(0);
                        } catch (error) {                   	
                            if (ponerror != undefined) 
                                    ponerror("No record found");
                        };
                    };
                });
            });
        };


        this.sqlcursor = function (table, key, index, ponsuccessread, ponerror, poncomplete) {
            this.db.transaction(function (tx) {
                tx.executeSql('SELECT [json] FROM ' + table, [], function (tx, results) {
                    if (ponsuccessread != undefined) {
                        try {
                            var len = results.rows.length, i;
                            for (i = 0; i < len; i++) {
                                ponsuccessread(JSON.parse(results.rows.item(i).json));
                            }
                            if (poncomplete != undefined) 
                                    poncomplete();
                        } catch (error) {
                            if (ponerror != undefined) 
                                    ponerror("No record found");
                        };
                    };
                });
            });
        };


        /*
         * The first method called and is opens the database for the page
         */
        this.sqlopenDB = function (onComplete) {
            this.db = openDatabase('rapidtrade', '1.0', 'MM database', 2 * 1024 * 1024);
            this.db.transaction(function (tx) {
                tx.executeSql('CREATE TABLE IF NOT EXISTS DisplayFields (keyf, json, index1, index2, index3, index4, primary key (keyf))');
                tx.executeSql('CREATE TABLE IF NOT EXISTS Options (keyf, json, index1, index2, index3, index4, primary key (keyf))');
                tx.executeSql('CREATE TABLE IF NOT EXISTS productcategories2 (keyf, json, index1, index2, index3, index4, primary key (keyf))');
                tx.executeSql('CREATE TABLE IF NOT EXISTS Unsent (keyf, json, index1, index2, index3, index4, primary key (keyf))');
                tx.executeSql('CREATE TABLE IF NOT EXISTS tree (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            });
            if (onComplete) onComplete();
        };

        this.sqldeleteDB = function (pondbdeleted) {

            localStorage.clear();
            sessionStorage.clear();

            this.db.transaction(function (tx) {
                tx.executeSql('drop table if EXISTS DisplayFields  ');
                tx.executeSql('drop table if EXISTS Options  ');
                tx.executeSql('drop table if EXISTS Unsent  ');
                tx.executeSql('drop table if EXISTS productcategories2  ');
                tx.executeSql('drop table if EXISTS tree  ');
            });

            if (pondbdeleted != undefined) 
                    pondbdeleted();
        };

        this.sqlclear = function (table, poncomplete, ponerror) {
            this.db.transaction(function (tx) {
                tx.executeSql('delete FROM ' + table, [], function (tx, results) {
                    if (poncomplete != undefined) {
                        poncomplete();
                    };
                });
            });
        };

        this.sqldeleteItem = function (table, key, idx, ponsuccessread, ponerror, poncomplete) {
            this.db.transaction(function (tx) {
                tx.executeSql('delete FROM ' + table + ' where keyf = ?', [key], function (tx, results) {
                    if (poncomplete != undefined) {
                        poncomplete();
                    };
                });
            });
        };       
    };

    return {
        getInstance: function(){
              if(!instance){
                  instance = new instanceObj; 
                  instance.openDB(undefined);
              }
              return instance; 
        }
    };	
})();
