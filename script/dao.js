var db;
function Dao() {
    /*
	 * this method is used to read the database.
	 * to be be consistent for indexeddb and websql we will trigger an event when we have read the data
	 */
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
            this.idbputMany(items, table, ponsuccesswrite, ponerror, poncomplete);
        else
            this.sqlputMany(items, table, ponsuccesswrite, ponerror, poncomplete);
    };

    this.update = function (json, table, key, ponsuccesswrite, ponerror, poncomplete) {

//    	console.log('Inserting ' + key + ' into table ' + table);

    	if ((table == 'ProductCategories2') && (!json.p))
    		json.p = 'PC';

        if (g_indexedDB) {
            this.idbput(json, table, key, ponsuccesswrite, ponerror, poncomplete);
            //if (ponerror) { ponerror('Unimplemented function!'); }
        } else {
            this.sqlupdate(json, table, key, ponsuccesswrite, ponerror, poncomplete);
        }
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

    this.cursor1 = function (table, ponsuccessread, ponerror, poncomplete) {
        if (g_indexedDB) {
            this.idbcursor1(table, ponsuccessread, ponerror, poncomplete);
        }
        else {
            this.sqlcursor1(table, ponsuccessread, ponerror, poncomplete);
        }
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
    Dao.prototype.openDB = function (pdbopened) {

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

        if (isIE())
        	g_indexedDB = true;
        if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent))
        	g_indexedDB = true;

        // TEST CODE
//        g_indexedDB = true;
       // END OF TEST CODE

        if (g_indexedDB)
            Dao.prototype.idbopenDB(pdbopened);
        else
            Dao.prototype.sqlopenDB(pdbopened);
    };

    /*
	 * d
	 */
    this.deleteDB = function (pondbdeleted) {
    	var seq = localStorage.getItem('sequenceNumber');
    	var seqday = localStorage.getItem('sequenceDay');
    	var portuguese = localStorage.getItem('Portuguese');

        if (g_indexedDB)
            this.idbdeleteDB(pondbdeleted);
        else
            this.sqldeleteDB(pondbdeleted);

        //reset sequence number
        if (seq) localStorage.setItem('sequenceNumber',seq);
        if (seqday) localStorage.setItem('sequenceDay', seqday);
        if (portuguese) localStorage.setItem('Portuguese', portuguese);
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

    this.fetchCompanies = function (searchText, ponsuccessread, ponerror, poncomplete) {

    	searchText = searchText || '';

    	var searchWords = searchText.split(/[ ]+/);

    	try {

    		(g_indexedDB ? this.idbFetchCompanies : this.sqlFetchCompanies)(searchWords, ponsuccessread, ponerror, poncomplete);

    	} catch (e) {

    		g_myterritorySortField = 'Name';
    		(g_indexedDB ? this.idbFetchCompanies : this.sqlFetchCompanies)(searchWords, ponsuccessread, ponerror, poncomplete);
    	}
    };

    this.fetchPricelist = function (searchText, ponsuccessread, ponerror, poncomplete, offset, limit, warehouse) {

    	searchText = searchText || '';

    	var searchWords = searchText.split(/[ ]+/);

    	try {

    		g_pricelistSortField = DaoOptions.getValue('PriceListSortField') || 'des';
    		if (g_indexedDB)
    			//TODO: implement offset / limit in indexeddb
    			this.idbFetchPricelist(searchWords, ponsuccessread, ponerror, poncomplete, offset, limit, warehouse);
    		else
    			this.sqlFetchPricelist(searchWords, ponsuccessread, ponerror, poncomplete, offset, limit, warehouse);

    	} catch (e) {

    		g_pricelistSortField = 'des';
    		(g_indexedDB ? this.idbFetchPricelist : this.sqlFetchPricelist)(searchWords, ponsuccessread, ponerror, poncomplete, offset, limit, warehouse);
    	}
    };

    this.fetchTemplateItems = function (template, ponsuccessread, ponerror, poncomplete) {

        this[(g_indexedDB ? 'idb' : 'sql') + 'FetchTemplateItems'](template, ponsuccessread, ponerror, poncomplete);
    }; //this.sqlFetchRoutesByDate =  function(selectedDate, ponsuccessread, ponerror, poncomplete)

    this.fetchRoutesByDate = function (selectedDate, ponsuccessread, ponerror, poncomplete) {
        if (g_indexedDB) {
            this.idFetchRoutesByDate(selectedDate, ponsuccessread, ponerror, poncomplete);
        } else {
            this.sqlFetchRoutesByDate(selectedDate, ponsuccessread, ponerror, poncomplete);
        };
    };

    this.fetchRouteDeliveries = function (routeID, selectedDate, ponsuccessread, ponerror, poncomplete) {
        if (g_indexedDB) {
            this.idFetchRouteDeliveries(routeID, selectedDate, ponsuccessread, ponerror, poncomplete);
        } else {
            this.sqlFetchRouteDeliveries(routeID, selectedDate, ponsuccessread, ponerror, poncomplete);
        };
    };

    this.fetchDeliveryDetails = function (podID, accountID, ponsuccessread, ponerror, poncomplete) {
        if (g_indexedDB) {
            this.idFetchDeliveryDetails(podID, accountID, ponsuccessread, ponerror, poncomplete);
        } else {
            this.sqlFetchDeliveryDetails(podID, accountID, ponsuccessread, ponerror, poncomplete);
        };
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
    this.idbputMany = function (json, table, ponsuccesswrite, ponerror, poncomplete) {
        $.each(json, function (index, j) {
            var k = syncGetKeyField(j, table);
            var dao = new Dao();
            dao.idbput(j, table, k, ponsuccesswrite, ponerror, function () {
                if ((index === json.lengthv - 1) && poncomplete)
                    poncomplete();
            });

        });
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

        if (table === 'ProductCategories2') {
            if (idx === 'index1')
                idx = 'p';
            else if (idx === 'index2')
                idx = 'c';
        } else if (table === 'BasketInfo') {
            if (idx === 'index1') idx = 'AccountID';
        } else if (table === 'Orders') {
            if (idx === 'index1') idx = 'AccountID';
        }


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
        if (!db || db === null) {
            if (navigator && navigator.notification) {
                navigator.notification.alert("The database is not ready yet!");
            } else {
                g_alert("The database is not ready yet!");
            }
            return;
        }
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
    Dao.prototype.idbopenDB = function (pdbopened) {

        window.indexedDB = window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.indexedDB;
        window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
        window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

        var request = window.indexedDB.open("RapidTrade12", 15);
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
                objectStore.createIndex("UserField01", "UserField01", { unique: false });
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
                objectStore.createIndex("AccountID", "AccountID", { unique: false });
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
                objectStore = db.createObjectStore("Orders", { keyPath: "key" });
                objectStore.createIndex("AccountID", "AccountID", { unique: false });
            } catch (error) {
                console.log("Already exists");
            }
            try {
                objectStore = db.createObjectStore("OrderItems", { keyPath: "key" });
            } catch (error) {
                console.log("Already exists");
            }
            try {
                objectStore = db.createObjectStore("Tpm", { keyPath: "key" });
            } catch (error) {
                console.log("Already exists");
			}
            try {
                objectStore = db.createObjectStore("Route", { keyPath: "key" });
				objectStore.createIndex("routeID", "routeID", { unique: false });
            } catch (error) {
                console.log("Already exists");
            }
        };
        request.onsuccess = function (event) {
            db = request.result;
            pdbopened();
        };
    };

    this.idbcount = function (table, key, index, poncomplete, ponerror) {
        //if (index != 'index1' && index != 'index2' && index != 'index3' && index != 'index4') {
        //    index = 'index1'; // index can only be either Index1 or Index2. so default to index1 of not valid
        //    console.log('Issue with this index used, defaulting to index1');
        //}

        var transaction = db.transaction(table, 'readonly');

        var tmpCount = 0;

        transaction.oncomplete = function (event) {

            if (poncomplete && tmpCount > 0)
                poncomplete(tmpCount);
        };

        transaction.onerror = function (event) {

            if (ponerror)
                ponerror(event);
        };

        var objectStore = transaction.objectStore(table);
        var idx = objectStore.index('AccountID');
        var singleKeyRange = IDBKeyRange.only(key);
        idx.openCursor(singleKeyRange).onsuccess = function (event) {

            var cursor = event.target.result;

            if (cursor) {


                var accountID = new String(cursor.value.AccountID);

                if (accountID == key)
                    ++tmpCount;

                cursor['continue']();

            } else if (ponerror) {

                ponerror("No record found.");
            }
        };

    };

    this.idbdeleteDB = function (pondbdeleted) {
        localStorage.clear();
        sessionStorage.clear();
        for (var x = 0; x < db.objectStoreNames.length; x++) {
            var table = db.objectStoreNames.item(x);
            var transaction = db.transaction(table, 'readwrite');

            // report on the success of opening the transaction
            transaction.oncomplete = function (event) {
                console.log('Transaction completed: database modification finished.');
            };


            transaction.onerror = function (event) {
                console.log('Transaction not opened due to error: ' + transaction.error );
            };

            try {
                var objectStore = transaction.objectStore(table);
                var objectStoreRequest = objectStore.clear();

                objectStoreRequest.onsuccess = function (event) {
                    // report the success of our clear operation
                    console.log('Data cleared for table: ' + event.target.source.name);
                };
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


    this.idbFetchCompanies = function(searchWords, ponsuccessread, ponerror, poncomplete) {

        var transaction = db.transaction('Companies');

        // Do something when all the data is added to the database.
        transaction.oncomplete = function (event) {

            if (poncomplete)
            	poncomplete();
        };

        transaction.onerror = function (event) {

            if (ponerror)
            	ponerror(event);
        };

        var objectStore = transaction.objectStore('Companies');
        var index = objectStore.index(g_myterritorySortField);

        index.openCursor().onsuccess = function (event) {

        	var cursor = event.target.result;

        	if (cursor) {

                var name = new String(cursor.value.Name).toLowerCase();
                var branchId = new String(cursor.value.BranchID).toLowerCase();

                var isFound = true;

                for ( var i = 0; i < searchWords.length; ++i) {

					word = searchWords[i].toLowerCase();

					isFound = isFound && (name.indexOf(word) != -1 || branchId.indexOf(word) != -1);

					if (!isFound)
						break;
				}

                if (isFound && ponsuccessread)
                	ponsuccessread(cursor.value);

                cursor['continue']();

            } else if (ponerror) {

                ponerror("No record found.");
            }
        };
    };


    this.idbFetchPricelist = function (searchWords, ponsuccessread, ponerror, poncomplete, offset, limit, warehouse) {

    	var isProductFound = function(product) {

    	    if (product.del)
    	        return false;
            var isFound = true;

            if (!((searchWords.length == 1) && ('' == searchWords[0]))) {

            	// if there are search words

                var productId = new String(product.id).toLowerCase();
                var description = new String(product[g_pricelistSortField]).toLowerCase();

                for (var i = 0; i < searchWords.length; ++i) {

                    word = searchWords[i].toLowerCase();

                    isFound = isFound && ((productId.indexOf(word) != -1) || (description.indexOf(word) != -1));

                    if (!isFound)
                            break;
                }
            }

            return isFound;
    	};

    	var transaction = db.transaction('Pricelists', 'readonly');

        transaction.oncomplete = function (event) {

            if (poncomplete)
            	poncomplete();
        };

        transaction.onerror = function (event) {

            if (ponerror)
            	ponerror(event);
        };

        var objectStore = transaction.objectStore('Pricelists');
        var index = objectStore.index(g_pricelistSortField);

        var indexFieldPrefix = 'PL:' + g_currentCompany().Pricelist + ';' + g_pricelistSortField.toUpperCase() + ':';
        var keyRange = IDBKeyRange.bound(indexFieldPrefix, indexFieldPrefix + '}}}');

        index.openCursor(keyRange).onsuccess = function (event) {

        	if (g_pricelistItemsOnPage < g_pricelistCurrentPricelistPage * g_numItemsPerPage) {

	        	var cursor = event.target.result;

	        	if (cursor) {

	        		cursor.value[g_pricelistSortField] = cursor.value[g_pricelistSortField].replace(indexFieldPrefix, '');

	        		if (isProductFound(cursor.value)) {

		        		if (g_pricelistItemsOnPage >= (g_pricelistCurrentPricelistPage - 1) * g_numItemsPerPage) {

                                            if (ponsuccessread)
                                                ponsuccessread(cursor.value);

		        		} else {

                                            ++g_pricelistItemsOnPage;
		        		}
	        		}

	                cursor['continue']();

	            } else if (ponerror) {

	                ponerror("No record found.");
	            }
        	}
        };
    };

    this.idbFetchTemplateItems = function(template, ponsuccessread, ponerror, poncomplete) {


    };

    /**************************************** Web SQL **********************************************
     *
     ***********************************************************************************************/
    /*
     * this method is used to read the database.
     * to be be consistent for indexeddb and websql we will trigger an event when we have read the data
     */
    this.sqlget = function (table, key, ponsuccessread, ponerror, poncomplete) {
        db.transaction(function (tx) {
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

                                if (poncomplete)
                                    poncomplete();
                            },
                            function (tx, e) {
                                if (ponerror != undefined)
                                	ponerror();
                                if (poncomplete)
                                    poncomplete();
                            });
        });
    };

    /*
     * pass in a jsonobject and
     */
    this.sqlput = function (item, table, keyf, ponsuccesswrite, ponerror, poncomplete) {
        db.transaction(function (tx) {
            var sql = 'INSERT or REPLACE INTO ' + table + '(keyf, json, index1, index2, index3, index4)'
                                    + 'VALUES (?,?,?,?,?,?)';
            tx.executeSql(sql,
                    [keyf, JSON.stringify(item), getsqlIndex1(table, item), getsqlIndex2(table, item), getsqlIndex3(table, item), getsqlIndex4(table, item)],
                    function (tx, results) {
                        if (ponsuccesswrite != undefined)
                            ponsuccesswrite();

                        if (poncomplete)
                            poncomplete();
                    },
                    function (tx, e) {
                        if (ponerror != undefined)
                            ponerror(tx, e);

                        if (poncomplete)
                            poncomplete();
                    });
        });
    };

    /*
     * pass in a jsonobject and
     */
    this.sqlputMany = function (items, table, ponsuccesswrite, ponerror, poncomplete) {

    	var that = this;

        db.transaction(function (tx) {
            $.each(items, function (i, item) {

            	if ((table == 'ProductCategories2') && (!item.p))
            		item.p = 'PC';

            	item.key = syncGetKeyField(item, table);

            	if (item.Deleted || item.del) {
            		that.deleteItem(table, item.key, undefined,	undefined, undefined, undefined);
            	}
            	else {
	            	var sql = 'INSERT or REPLACE INTO ' + table + '(keyf, json, index1, index2,index3, index4) VALUES (?,?,?,?,?,?)';
	            	tx.executeSql(sql, [item.key, JSON.stringify(item), getsqlIndex1(table, item), getsqlIndex2(table, item), getsqlIndex3(table, item), getsqlIndex4(table, item)]);
            	}
            });

            if (poncomplete != undefined) {
                poncomplete();
            }
        },

        function (tx) {
            // error
            //alert('1.Something went wrong: ');
            if (ponerror != undefined)
            	ponerror(tx);
            else
                console.log(tx);
        });

    };

    this.sqlupdate = function(item, table, keyf, ponsuccesswrite, ponerror, poncomplete) {
        db.transaction(function (tx) {
            var sql = 'UPDATE ' + table + ' SET json=?, index1=?, index2=?, index3=?, index4=? WHERE keyf=? ';

            tx.executeSql(sql,
                    [JSON.stringify(item), getsqlIndex1(table, item), getsqlIndex2(table, item), getsqlIndex3(table, item), getsqlIndex4(table, item), keyf],
                    function (tx, results) {
                        if (ponsuccesswrite !== undefined)
                            ponsuccesswrite();

                        if (poncomplete)
                            poncomplete();
                    },
                    function (tx, e) {
                        if (ponerror !== undefined)
                            ponerror(tx, e);

                        if (poncomplete)
                            poncomplete();
                    });
        });
    };

    //todo - turn these into proper functions
    function getsqlIndex1(table, item) {
        try {
            if (table == 'Companies') {
                return item.AccountID;
            } else if (table == 'CallCycle') {
                return item.Week;
            } else if (table == 'Pricelists') {
                return item.pl;
            } else if (table == 'DisplayFields') {
                return item.ID;
            } else if (table == 'Address') {
                return item.AccountID;
            } else if (table == 'BasketInfo') {
                return item.AccountID;
            } else if (table == 'Stock') {
                return item.ProductID;
            } else if ((table == 'ProductCategories2') || (table == 'ProductCategory2Link')) {
                return item.p;
            } else if (table == 'Orders') {
                return $.trim(item.AccountID);
            } else if (table == 'OrderItems') {
                return $.trim(item.AccountID) + $.trim(item.ProductID);
            } else if (table == 'Route') {
                return $.trim(item.routeID);
            } else if (table == 'Discount') {
                return $.trim(item.DiscountID);
            } else if (table == 'DiscountCondition') {
                return $.trim(item.DiscountID);
            } else if (table == 'DiscountValues') {
                return $.trim(item.DiscountID);
            }

            return '';

        } catch (error) {

            return '';
        };
    };

    function getsqlIndex2(table, item) {

        try {
            if (table == 'Companies') {
                return item[g_myterritorySortField].toLowerCase();
            } else if (table == 'Pricelists') {
                return item[g_pricelistSortField].toLowerCase();
            } else if (table == 'BasketInfo') {
            	return item.ProductID;
            } else if (table == 'Stock') {
                return item.Warehouse;
            } else if ((table == 'ProductCategories2') || (table == 'ProductCategory2Link')) {
                return item.c;
            } else if (table == 'Orders') {
                return item.OrderID;
            } else if (table == 'OrderItems') {
                return item.OrderID;
            } else if (table == 'Discount') {
                return $.trim(item.SortOrder);
            };

            return '';

        } catch (error) {

            return '';
        };
    };

    function getsqlIndex3(table, item) {
        try {
            if (table == 'Pricelists') {
                return item.id;
            } else if (table == 'BasketInfo') {
            	return item.Quantity;
            } else if (table == 'Stock') {
                return item.Stock;
            } else if (table == 'ProductCategories2') {
            	return item.des;
            } else if (table == 'Orders') {
                return item.UserField01;
            } else if (table == 'OrderItems') {
                return $.trim(item.ProductID);
            } else if (table == 'DiscountValues') {
                var fromDate = moment(parseInt(item.FromDate.substr(6)));
                return fromDate.format('YYYY-MM-DD');
            };
            return '';
        } catch (error) {
            return '';
        };
    };

    function getsqlIndex4(table, item) {
        try {
            if (table == 'Pricelists') {
                return item.cn;
            } else if (table == 'BasketInfo') {
            	return item.Description;
            } else if (table == 'Orders') {
                /* we need UserID in Orders table for Routes logic*/
            	return item.UserID;
            } else if (table == 'DiscountValues') {
                var toDate = moment(parseInt(item.ToDate.substr(6)));
                return toDate.format('YYYY-MM-DD');
            }
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
        var sql = 'SELECT [json] FROM ' + table + ' where ' + checkindex(idx) + '= ?';
        db.transaction(function (tx) {
            tx.executeSql(sql, [key], function (tx, results) {
                if (ponsuccessread != undefined) {
                    try {
                    	var len = results.rows.length, i;
                    	if (!len && ponerror) {
                            ponerror(key);
                    	}
                    	for (i = 0; i < len; i++) {
                            ponsuccessread(JSON.parse(results.rows.item(i).json));
                        }
                        if (poncomplete != undefined)
                        	poncomplete();
                    } catch (error) {
                        if (ponerror)
                        	ponerror("No record found");
                    };
                };
            });
        });
    };

    this.sqlindexsorted = function (table, key, idx, sortidx, ponsuccessread, ponerror, poncomplete) {
        db.transaction(function (tx) {
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
        db.transaction(function (tx) {
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
        db.transaction(function (tx) {
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
    Dao.prototype.sqlopenDB = function (pdbopened) {
        if (g_phonegap) {
            if (!window.sqlitePlugin) {
                setTimeout(function (){
                    Dao.prototype.sqlopenDB(pdbopened);
                }, 1000);
                return;
            }
            db = window.sqlitePlugin.openDatabase({name: 'rapidtrade', location: 'default'});
        } else {
            db = openDatabase('rapidtrade', '1.0', 'Rapidtrade database', 50 * 1024 * 1024);
        }

        db.transaction(function (tx) {

            tx.executeSql('DROP TABLE IF EXISTS Activities');
            tx.executeSql('DROP TABLE IF EXISTS Products');

            tx.executeSql('CREATE TABLE IF NOT EXISTS Companies (keyf, json, index1, index2, index3, index4,  primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Pricelists (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS DisplayFields (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Options (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS ActivityTypes (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Users (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Contacts (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS BasketInfo (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS CallCycle (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Discount (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS DiscountCondition (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS DiscountValues (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS ProductCategories2 (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS ProductCategory2Link (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Address (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Stock (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Orders (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS OrderItems (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Unsent (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Tpm (keyf, json, index1, index2, index3, index4, primary key (keyf))');
            tx.executeSql('CREATE TABLE IF NOT EXISTS Route (keyf, json, index1, index2, index3, index4, primary key (keyf))');

            var tables = ['Pricelists', 'ProductCategories2', 'ProductCategory2Link'];
            for ( var i = 0; i < tables.length; i++)
            	for ( var j = 1; j <= 4; j++)
            		tx.executeSql('CREATE INDEX IF NOT EXISTS idxindex' + j + ' ON ' + tables[i] + ' (index' + j + ')');
        });
        pdbopened();
    };

    this.sqldeleteDB = function (pondbdeleted) {

        localStorage.clear();
        sessionStorage.clear();

        if (g_phonegap) {
            window.sqlitePlugin.deleteDatabase({name: 'rapidtrade', location: 'default'}, pondbdeleted, function(err) {
                console.log(err);
            });
        } else {
            db.transaction(function (tx) {
                tx.executeSql('drop table if EXISTS Companies  ');
                tx.executeSql('drop table if EXISTS Pricelists  ');
                tx.executeSql('drop table if EXISTS DisplayFields  ');
                tx.executeSql('drop table if EXISTS Options  ');
                tx.executeSql('drop table if EXISTS ActivityTypes  ');
                tx.executeSql('drop table if EXISTS Users  ');
                tx.executeSql('drop table if EXISTS Contacts  ');
                tx.executeSql('drop table if EXISTS BasketInfo  ');
                tx.executeSql('drop table if EXISTS CallCycle  ');
                tx.executeSql('drop table if EXISTS Discount  ');
                tx.executeSql('drop table if EXISTS DiscountCondition  ');
                tx.executeSql('drop table if EXISTS DiscountValues  ');
                tx.executeSql('drop table if EXISTS ProductCategories2  ');
                tx.executeSql('drop table if EXISTS ProductCategory2Link  ');
                tx.executeSql('drop table if EXISTS Address  ');
                tx.executeSql('drop table if EXISTS Stock  ');
                tx.executeSql('drop table if EXISTS Orders  ');
                tx.executeSql('drop table if EXISTS OrderItems  ');
                tx.executeSql('drop table if EXISTS Unsent  ');
                tx.executeSql('drop table if EXISTS Tpm  ');
                tx.executeSql('drop table if EXISTS Route  ');
            });

            if (pondbdeleted != undefined)
            	pondbdeleted();
        }
    };

    this.sqlclear = function (table, poncomplete, ponerror) {
        db.transaction(function (tx) {
            tx.executeSql('delete FROM ' + table, [], function (tx, results) {
                if (poncomplete != undefined) {
                    poncomplete();
                };
            });
        });
    };

    this.sqldeleteItem = function (table, key, idx, ponsuccessread, ponerror, poncomplete) {
        db.transaction(function (tx) {
            tx.executeSql('delete FROM ' + table + ' where keyf = ?', [key], function (tx, results) {
                if (poncomplete != undefined) {
                    poncomplete();
                };
            });
        });
    };

    this.sqlclearBasket = function (table, accountId, type, ponerror, poncomplete) {

        db.transaction(function (tx) {
        	try {
        		var query = 'DELETE FROM BasketInfo WHERE [json] LIKE \'%"AccountID":"' + accountId + '"%\'';
        		console.log(query);
            	tx.executeSql(query, [], function (tx, results) {
            		try {
	            		if (poncomplete)
	            			poncomplete();
            		} catch(error) {
                		if (ponerror)
                			ponerror(error);
            		}
            	});
        	} catch (error) {
        		if (ponerror)
        			ponerror(error);
        	}
        });
    };

    this.sqlFetchCompanies = function(searchWords, ponsuccessread, ponerror, poncomplete) {

        db.transaction(function (tx) {

        	var query = 'SELECT json FROM Companies WHERE ';

        	for (var i = 0; i < searchWords.length; ++i) {

        		query += 'json like \'%' + searchWords[i].replace(' ', '%') + '%\'';

        		if (i < searchWords.length - 1)
        			query += ' AND ';
        	}

        	query += ' ORDER BY index2';

            tx.executeSql(query,[],

            		function (tx, results) {

		                try {

                                    if (ponsuccessread) {

		                        for (var i = 0; i < results.rows.length; ++i) {

                                            var company = JSON.parse(results.rows.item(i).json);
                                            ponsuccessread(company);
		                        }
                                    }

                                    if (results.rows.length==0 && ponerror)
                                        ponerror("No record found");

                                    if (poncomplete)
                                        poncomplete();

		                } catch (error) {

		                    if (ponerror)
		                    	ponerror("No record found");
		                };
            		});
        });
    };


    this.sqlFetchPricelist = function(searchWords, ponsuccessread, ponerror, poncomplete, offset, limit, warehouse) {

        isBarCodeSearch = (searchWords.length == 1) && (searchWords[0].indexOf('b":"') != -1);

        db.transaction(function (tx) {
        	//var query = 'SELECT json FROM Pricelists WHERE index1 = ? AND ';
        	var includeCategoryToggle = 'off'; // (sessionStorage.getItem('expandcategory')) ? 'on' : 'off';
        	var query = '';
        	if (includeCategoryToggle != 'on') {
                    query = 'select p.json, b.json as BasketInfo, s.index3 as Stock from Pricelists p ' +
                            'left outer join basketinfo b on p.index3 = b.index2 and b.index1 = ? ' +
                            (DaoOptions.getValue('VanandWareOrder', 'false') === 'true' ? 'inner' : 'left outer') + ' join stock s on s.index1 = p.index3 and s.index2 = ? ' +
                            'WHERE p.index1 = ? AND ';
                    for (var i = 0; i < searchWords.length; ++i) {
                            query += 'p.json like \'%' + searchWords[i].replace(' ', '%') + '%\'';
                            if (i < searchWords.length - 1)
                                    query += ' AND ';
                    }
        	} else {
        		// this search will include all other products in the products category
        		query = 'select p.json, b.json as BasketInfo, s.index3 as Stock  ' +
						' from Pricelists p  ' +
						' left outer join basketinfo b on p.index3 = b.index2 and b.index1 = ?  ' +
						(DaoOptions.getValue('VanandWareOrder', 'false') === 'true' ? 'inner' : 'left outer') + ' join stock s on s.index1 = p.index3 and s.index2 = ?  ' +
						' WHERE p.index1 = ?  ' +
						'   AND p.index4 in ( ' +
						'       select distinct p.index4 ' +
						'       from Pricelists p  where ' +
						'p.json like \'%';

        		for (var i = 0; i < searchWords.length; ++i) {
	        		query +=  searchWords[i];
	        		if (i < searchWords.length - 1)
            			query += ' ';
	        	}
	        	query += '%\')';
        	}

        	// limit 50 offset 0
        	query += ' ORDER BY p.index2 limit ' + limit + ' offset ' + offset;
        	console.log(query);
            tx.executeSql(query,[g_currentCompany().AccountID, warehouse ? warehouse : g_currentCompany().BranchID, g_currentCompany().Pricelist],
            		function (tx, results) {
		                try {
		                	if (ponsuccessread)
		                        for (var i = 0; i < results.rows.length; ++i) {
                                            if (g_pricelistItemsOnPage < g_pricelistCurrentPricelistPage * g_numItemsPerPage - offset) {
                                                if (g_pricelistItemsOnPage >= (g_pricelistCurrentPricelistPage - 1) * g_numItemsPerPage - offset) {
		                                    var product = JSON.parse(results.rows.item(i).json);
		                                    var barcode = searchWords[0].slice(4, searchWords[0].length);

                                                    product.BasketInfo = JSON.parse(results.rows.item(i).BasketInfo || '{}');
                                                    product.Stock = results.rows.item(i).Stock || '';


		                                    if ((!isBarCodeSearch) || (isBarCodeSearch && (product.b == barcode)))
		                                        ponsuccessread(product);
				                		} else {
				                			++g_pricelistItemsOnPage;
				                		}
				                	} else {
				                		break;
				                	}
		                        }

		                	if (results.rows.length==0 && ponerror)
		                		ponerror("No record found");

		                	if (poncomplete)
	                        	poncomplete();

		                } catch (error) {

		                    if (ponerror)
		                    	ponerror("No record found");
		                };
            		});
        });
    };

    this.sqlFetchTemplateItems = function(template, ponsuccessread, ponerror, poncomplete) {

        var query = 'select oi.json, b.index3 as Basket, s.index3 as Stock from OrderItems oi' +
                    ' left outer join basketinfo b on oi.index3 = b.index2 and b.index1 = \'' + g_currentCompany().AccountID + '\'' +
                    ' left outer join stock s on s.index1 = oi.index3 and s.index2 = \'' + g_currentCompany().BranchID + '\'' +
                    ' where oi.index2 = \'' + g_currentCompany().AccountID + '-' + template + '\'';

        console.log(query);

        db.transaction(function (tx) {

            tx.executeSql(query,[],
                function (tx, results) {
                    try {
                        if (ponsuccessread) {

                            for (var i = 0; i < results.rows.length; ++i) {

                                var item = results.rows.item(i);
                                var product = JSON.parse(item.json);

                                product.BasketQty = item.Basket;
                                product.Stock = item.Stock;

                                ponsuccessread(product);
                            }
                        }

                        if (!results.rows.length && ponerror)
                            ponerror("No record found");

                        if (poncomplete)
                            poncomplete();

                    } catch (error) {

                        if (ponerror)
                            ponerror("No record found");
                    };
                });
            });
    };

    this.sqlFetchRoutesByDate =  function(selectedDate, ponsuccessread, ponerror, poncomplete) {
        var query = 'SELECT distinct r.json, ' +
                    ' (SELECT count(*) FROM Orders where index3 = r.index1 and json like \'%"CreateDate":"' + selectedDate + '%\' and (index4=\'\' or ' +
                    ' index4=\'' + g_currentUser().UserID + '\' )) as numOfRouts, ord.index4 as UserID FROM Route r' +
                    ' inner join Orders ord on ord.index3 = r.index1 ' +
                    ' where ord.json like \'%"CreateDate":"' + selectedDate + '%\'';
            /* select only rautes for current user and selected date */
        console.log(query);

        db.transaction(function (tx) {

            tx.executeSql(query,[],
                function (tx, results) {
                    try {
                        var res = [];
                        //if (ponsuccessread) {
                        if (results.rows.length > 0) {
                            for (var i = 0; i < results.rows.length; ++i) {

                                var item = results.rows.item(i);
                                var route = JSON.parse(item.json);
                                route.numOfRouts = item.numOfRouts;
                                route.UserID = item.UserID;
                                res.push(route);
                                //ponsuccessread(route);
                            }
                        }

                        if (!results.rows.length && ponerror)
                            ponerror("No record found");

                        if (poncomplete)
                            poncomplete(res);

                    } catch (error) {

                        if (ponerror)
                            ponerror("No record found");
                    };
                });
            });
    };

    this.idFetchRoutesByDate = function (selectedDate, ponsuccessread, ponerror, poncomplete) {
        if (ponerror)
            ponerror("Function Dao.idFetchRoutesByDate is still not correntlly implemented!!!");

        if (poncomplete) {
            var res = [];
            poncomplete(res);
        }
    };

    this.sqlFetchRouteDeliveries =  function(routeID, selectedDate, ponsuccessread, ponerror, poncomplete) {
        var query = 'SELECT distinct ord.json FROM Orders ord' +
                    ' where ord.json like \'%"RequiredByDate":"' + selectedDate + '%\' and index3 = \'' + routeID + '\'';

        console.log(query);

        db.transaction(function (tx) {

            tx.executeSql(query,[],
                function (tx, results) {
                    try {
                        var res = [];
                        //if (ponsuccessread) {
                        if (results.rows.length > 0) {
                            for (var i = 0; i < results.rows.length; ++i) {

                                var item = results.rows.item(i);
                                var deliv = JSON.parse(item.json);

                                res.push(deliv);
                                //ponsuccessread(route);
                            }
                        }

                        if (!results.rows.length && ponerror)
                            ponerror("No record found");

                        if (poncomplete)
                            poncomplete(res);

                    } catch (error) {

                        if (ponerror)
                            ponerror("No record found");
                    };
                });
            });
    };

    this.idFetchRouteDeliveries = function (routeID, selectedDate, ponsuccessread, ponerror, poncomplete) {
        var transaction = db.transaction('Orders');

        var delivResult = [];

        // Do something when all the data is added to the database.
        transaction.oncomplete = function (event) {

            if (poncomplete)
                poncomplete(delivResult);
        };

        transaction.onerror = function (event) {

            if (ponerror)
                ponerror(event);
        };

        var objectStore = transaction.objectStore('Orders');
        //var index = objectStore.index();

        objectStore.openCursor().onsuccess = function (event) {

            var cursor = event.target.result;

            if (cursor) {

                var rID = cursor.value.UserField01;
                var cDate = cursor.value.CreateDate;
                var ordType = cursor.value.Type;

                cDate = cDate ? cDate.substring(0, 10).trim() : '';

                if (rID === routeID && ordType === 'Deliv' && cDate === selectedDate)
                    delivResult.push(cursor.value);




                cursor['continue']();

            } else if (ponerror) {

                ponerror("No record found.");
            }
        };
    };

    this.sqlFetchDeliveryDetails = function (podID, accountID, ponsuccessread, ponerror, poncomplete) {
        var query = 'SELECT distinct oi.json FROM OrderItems oi' +
                    ' where oi.index2=\'' + podID + '\' ';

        console.log(query);

        db.transaction(function (tx) {

            tx.executeSql(query,[],
                function (tx, results) {
                    try {
                        var res = [];
                        //if (ponsuccessread) {
                        if (results.rows.length > 0) {
                            for (var i = 0; i < results.rows.length; ++i) {

                                var item = results.rows.item(i);
                                var delivItem = JSON.parse(item.json);

                                res.push(delivItem);
                                //ponsuccessread(route);
                            }
                        }

                        if (!results.rows.length && ponerror)
                            ponerror("No record found");

                        if (poncomplete)
                            poncomplete(res);

                    } catch (error) {

                        if (ponerror)
                            ponerror("No record found");
                    };
                });
            });
    };

    this.idFetchDeliveryDetails = function (podID, accountID, ponsuccessread, ponerror, poncomplete) {
        var transaction = db.transaction('OrderItems');

        var delivResult = [];

        // Do something when all the data is added to the database.
        transaction.oncomplete = function (event) {

            if (poncomplete)
                poncomplete(delivResult);
        };

        transaction.onerror = function (event) {

            if (ponerror)
                ponerror(event);
        };

        var objectStore = transaction.objectStore('OrderItems');
        //var index = objectStore.index();

        objectStore.openCursor().onsuccess = function (event) {

            var cursor = event.target.result;

            if (cursor) {

                var pID = cursor.value.OrderID;
                var accID = cursor.value.AccountID;


                if (pID === podID && accID === accountID)
                    delivResult.push(cursor.value);




                cursor['continue']();

            } else if (ponerror) {

                ponerror("No record found.");
            }
        };
    };

    this.sqlcursor1 =  function(table, ponsuccessread, ponerror, poncomplete) {
        var query = 'SELECT [json] FROM ' + table;

        console.log(query);

        db.transaction(function (tx) {

            tx.executeSql(query,[],
                function (tx, results) {
                    try {
                        var res = [];
                        //if (ponsuccessread) {
                        if (results.rows.length > 0) {
                            for (var i = 0; i < results.rows.length; ++i) {

                                var item = results.rows.item(i);
                                var jsonObj = JSON.parse(item.json);

                                res.push(jsonObj);
                                //ponsuccessread(route);
                            }
                        }

                        if (!results.rows.length && ponerror)
                            ponerror("No record found");

                        if (poncomplete)
                            poncomplete(res);

                    } catch (error) {

                        if (ponerror)
                            ponerror("No record found");
                    };
                });
            });
    };

    this.idbcursor1 = function (table, ponsuccessread, ponerror, poncomplete) {

        var result = [];

        var transaction = db.transaction(table, "readwrite");
        // Do something when all the data is added to the database.
        transaction.oncomplete = function (event) {
            if (poncomplete != undefined)
                poncomplete(result);
        };

        transaction.onerror = function (event) {
            if (ponerror != undefined)
                ponerror(event);
        };

        var objectStore = transaction.objectStore(table);
        objectStore.dao = this;
        objectStore.openCursor().onsuccess = function (event) {
            var cursor = event.target.result;
            if (cursor) {
                //$(document).trigger('rowreadOK',cursor.value);
                if (ponsuccessread != undefined)
                    ponsuccessread(cursor.value);

                result.push(cursor.value);

                cursor['continue']();
            }


        };
    };

    this.execSQL = function (sql, onsuccess, onerror) {

        db.transaction(function (tx) {

            tx.executeSql(sql,[],
                function (tx, results) {
                    try {
                        var res = [];
                        //if (ponsuccessread) {
                        if (results.rows.length > 0) {
                            for (var i = 0; i < results.rows.length; ++i) {

                                var item = results.rows.item(i);
                                var jsonObj = JSON.parse(item.json);

                                res.push(jsonObj);
                                //ponsuccessread(route);
                            }
                        }

                        if (!results.rows.length && onerror)
                            onerror("No record found");

                        if (results.rows.length && onsuccess)
                            onsuccess(res);

                    } catch (error) {

                        if (onerror)
                            onerror("No record found: error");
                    };
                });
            }, function(err) {
                if (onerror) onerror(err);
            });
    }
}
