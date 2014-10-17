
var alphaFilter = (function(){
	var instance;
	
	function alphaObj() {
		
		this.init = function (tag){
			this.shoppingcartalpha = [];
			$(tag).empty();
		};
		
		this.addClass = function (descr){
			try {
				var firstChr = descr.substring(0,1).toUpperCase();
				if (this.shoppingcartalpha.indexOf(firstChr) == -1) this.shoppingcartalpha.push(firstChr);
				return(' class="item' + firstChr + '" ');
			} catch (err){
				console.log(err.message);
			}	
		};
		
		this.HTML = function (tag, listtag){
			try {
				if (this.shoppingcartalpha.length < 3) {
					$(tag).addClass('invisible');
					return;
				}
				
				var html = '<input class="rb" id="radioall" onclick="alphaFilter.getInstance().filter(\'*\',\'' + listtag + '\')" name="" value="*" type="radio"><label for="radioall">*</label>';
				this.shoppingcartalpha.sort();
				for (var i=0;i < this.shoppingcartalpha.length;i++){
					html += '<input class="rb"  onclick="alphaFilter.getInstance().filter(\'' + this.shoppingcartalpha[i] + '\',\'' + listtag + '\')" id="radio' + this.shoppingcartalpha[i] + '" name="" value="' + this.shoppingcartalpha[i] + '" type="radio"><label for="radio' + this.shoppingcartalpha[i] + '">' + this.shoppingcartalpha[i] + '</label>';				
				}
				g_append(tag, html);
				$(tag).trigger('create');
				//$(tag).checkboxradio('refresh');
				$(tag).removeClass('invisible');
				
			} catch (err){
				console.log(err.message);
			}	
		};
		
		this.filter = function (letter, tag){
			if (letter == '*') {
				$(tag + ' li').show();
			} else {
				$(tag).removeAttr('data-autodividers');
				$(tag + ' li').hide();
				$(tag + ' .item' + letter).show();
				$(tag).listview('refresh');		
			}
		};
	};
	
	return {
        getInstance: function(){
              if(!instance){
            	  instance = new alphaObj; 
              }
              return instance; 
        }
	};
	
	
})();

var categories = (function(){
	var instance;
	
	function catObj() {
            
            var that = this;
		
            this.init = function (){
                this.acategories = [];    
                this.categoryDescriptions = {};
            };

            this.addCategory = function (category){
                try {			
                    if (this.acategories.indexOf(category) == -1) {
                        this.acategories.push(category);

                        var dao = new Dao();
                        dao.index('ProductCategories2', category, 'index2', function(item) {
                            that.categoryDescriptions[item.c] = item.des;
                        });
                    }
                } catch (err){
                    console.log(err.message);
                }	
            };

            this.showPopup = function (ultag, popuptag){
                    try {
                            if (this.acategories.length == 1) {
                                pricelistCategorySearch(this.acategories[0]);
                                return;
                            }

                            var html = ' <li data-role="divider" data-theme="e">Choose category</li>';
                            for (var i=0;i < this.acategories.length;i++){
                                html += '<li><a href="#" onclick="categories.getInstance().fetchCategory(\'' + this.acategories[i] + '\',\'' + popuptag + '\' )">'  + (this.categoryDescriptions[this.acategories[i]] || this.acategories[i]) + '</a></li>';
                            }
                            $(ultag).empty();
                            g_append(ultag, html);
                            $(ultag).listview('refresh');
                            //$(ultag).trigger('create');

                            $( popuptag ).popup( 'open' );

                    } catch (err){
                            console.log(err.message);
                    }	
            };

            this.fetchCategory = function (category, popuptag){
                    $( popuptag ).popup('close');
                    pricelistCategorySearch(category);

            };
		
	};
	
	return {
        getInstance: function(){
              if(!instance){
            	  instance = new catObj; 
              }
              return instance; 
        }
	};
	
	
})();


  




