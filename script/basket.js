var basket = (function() {

    // Private
    
    var savedItems = 0;
    var totalItems = 1;
    var callback = undefined;
    
    // Public
    
    /*
     * saveItem(item)
     * saveItems(itemArray)
     */
    
    return {
        
        saveItem: function(item, quantity, onComplete) {              
            
            if (onComplete) {
                
                callback = onComplete;
                savedItems = 0;
                totalItems = 1;
            }
            
            item.Quantity =  quantity || item.Quantity;
            
            if (!item.Quantity && !(sessionStorage.getItem('wasOnShoppingCart') === 'true')) {
                
                log('!!! ERROR: Quantity is not defined for product ' + item.ProductID);
                return;
            }
            
            checkItemFields(item);                          
            
            var dao = new Dao();
            // as the old logic dao.put does not update an existing item within BasketInfo,
            // but deletes it and insert as a new, we need to check if the item is already in basket
            // and just update is to keep the order of items as they were added
            //dao.put(item, 'BasketInfo', item.key, onItemSaved);
            dao.get('BasketInfo', item.key, function(basketinfo) {
                // item exists, so we are going to update it
                var innerDao = new Dao();
                innerDao.update(item, 'BasketInfo', item.key, onItemSaved);
            }, function() {
                // item does not exist, so we can use the old call
                var innerDao = new Dao();
                innerDao.put(item, 'BasketInfo', item.key, onItemSaved);
            });
        },
        
        saveItems: function(itemArray, onComplete) {            
            
            $.mobile.showPageLoadingMsg();
            
            callback = onComplete;
            
            savedItems = 0;            
            totalItems = itemArray.length;
            
            for (var i = 0; i < totalItems; ++i)
                this.saveItem(itemArray[i]);
        }
    }; 
    
    // Private    
    
    function checkItemFields(item) {
        
            item.AccountID = item.AccountID || g_currentCompany().AccountID;
            item.Description = item.Description || item.PromoDescription;
            
            if (isNaN(item.Discount))            
                item.Discount = parseFloat(item.Discount);
            
            item.ProductID = item.ProductID || item.productId || item.PromoProductID;
            
            if (isNaN(item.RepDiscount))            
                item.RepDiscount = parseFloat(item.RepDiscount);                        
        
            item.SupplierID = item.SupplierID || g_currentUser().SupplierID;
            item.Type = item.Type || $.trim(sessionStorage.getItem('currentordertype'));
            
            var unit = item.Unit || item.UOM;
            item.Unit = g_isPackSizeUnitValid(unit) ? unit : '';
            item.UserID = item.UserID || g_currentUser().UserID;            
                        
            item.RepChangedPrice =  item.RepChangedPrice || (item.RepNett && (item.Nett !== item.RepNett));            
            item.key = item.ProductID.trim() + g_currentUser().SupplierID + g_currentUser().UserID + item.AccountID.trim() + item.Type;        
    }
    
    function onItemSaved() {
        
        if (!savedItems++)
            log('Saving ' + totalItems + ' item(s)...');
        
        log('Item ' + savedItems + ' saved.');
        
        if (savedItems === totalItems) {
            
            $.mobile.hidePageLoadingMsg();
            
            if (callback) {
                
                log('Executing callback function...');
                callback();
            }            
        }
    }
    
    function log(text) {
        
        console.log('BASKET: ' + text);
    }
    
})();