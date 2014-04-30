
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
		
		this.init = function (){
			this.acategories = [];
		};
		
		this.addCategory = function (category){
			try {			
				if (this.acategories.indexOf(category) == -1) this.acategories.push(category);
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
					html += '<li><a href="#" onclick="categories.getInstance().fetchCategory(\'' + this.acategories[i] + '\',\'' + popuptag + '\' )">'  + this.acategories[i] + '</a></li>';
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


var jsonform = (function(){
    var instance;	
    function instanceObj() {
        this.divID = '';
        this.vjson = '';
        this.vid = '';
        this.vsupplierid = '';
        this.vJsonFormOnComplete;
        this.keyField = '';
        this.mode = 'display';
        this.jsonArray = new Array();
        this.displayfields = new Array();
        this.type = 'table';
        /*
         * 
         * @param {type} supplierid
         * @param {type} divID = id of div field to put table
         * @param {type} jsonarray = array with data
         * @param {type} id = Displayfield ID
         * @param {type} keyField = for 
         * @returns {undefined}
         */
        this.show = function (divID, jsonarray, id, keyField, mode, type) {
            //Save globals for async call's
            this.vJsonFormOnComplete = this.oncomplete;
            this.divID = '#' + divID;
            this.jsonArray = jsonarray;
            this.vid = id;
            this.keyField = keyField;
            this.displayfields = new Array();
            this.mode = mode;
            this.type = type;
            //session object is updated when data on screen is updated
            sessionStorage.setItem('json' + id,JSON.stringify(jsonarray));
            $(this.divID).empty();
            this.fetchDisplayFields();
        };

        this.isValid = function() {
            var isValid = true;
            $('#errorMessage').empty();
            $(':input.mandatory').each(function() {
                    if ($.trim($(this).val()) === '') {
                            $('#errorMessage').addClass('redpanel');
                            $('#errorMessage').text($(this).attr('name') + ' is a required field. Please ' + (this.tagName === 'INPUT' ? 'enter' : 'choose') + ' a value.'); 
                            isValid = false;
                            return false;
                    }
            });
            return isValid;
        };


        /*
         * fetch display fields from the database
         */
        this.fetchDisplayFields = function() {	    
            //$(this.formid).empty();
            //this.jsonArray.splice(0, this.jsonArray.length);
            dao.getInstance().index('DisplayFields',
                                    this.vid, 
                                    'index1',
                                    jsonform.getInstance().fetchDisplayFieldsOnSuccess,
                                    jsonform.getInstance().fetchDisplayFieldsOnError,
                                    jsonform.getInstance().fetchDisplayFieldsOnComplete);
        };	

        /*
         * found displayfields
         */
        this.fetchDisplayFieldsOnSuccess = function (displayfield) {
            if (displayfield.Visible === true) {
                jsonform.getInstance().displayfields.push(displayfield);
            }
        };
        
        
        /*
         * No local display fields so see if we have defaults defined
         */
        this.fetchDisplayFieldsOnError = function(){
            try {
                jsonform.getInstance().displayfields = g_getDefaults(jsonform.getInstance().vid);
            } catch (err){
                
            }
        };
        
        /*
         * 
         */
        this.fetchDisplayFieldsOnComplete = function () {
            var me = jsonform.getInstance();
            var displayObjects = new Object();
            displayObjects = me.displayfields.sort(function (a, b) { return parseFloat(a.SortOrder) - parseFloat(b.SortOrder); });
            
            switch (me.type) {
                case 'table':
                  me.buildTable(displayObjects);
                  break;
                case 'listview':
                  me.buildListView(displayObjects);
                  break;
                case 'form':
                  me.buildForm(displayObjects);
                  break;
            }
            g_busy(false);         
            if (me.vJsonFormOnComplete !== undefined)
                me.vJsonFormOnComplete();

        };   
        
        this.showDetail = function(key, id){
            var me = jsonform.getInstance();
            $('#labelh1').addClass('invisible');
            $('#jsonpanel').addClass('invisible');
            $('#jsondetail').removeClass('invisible');
            $('#backbtn').removeClass('invisible');
            if (me.mode === 'edit') $('#savebtn').removeClass('invisible');
            
            var obj = JSON.parse(sessionStorage.getItem(key));
            jsonform.getInstance().show('jsondetail', obj, id, '', me.mode, 'form');
        };
        
        this.hideDetail = function(){
            var me = jsonform.getInstance();           
            $('#labelh1').removeClass('invisible');
            $('#jsonpanel').removeClass('invisible');
            $('#jsondetail').addClass('invisible');
            $('#backbtn').addClass('invisible');
            $('#savebtn').addClass('invisible');
            
        };
        
        this.buildListView = function(displayObjects) {
            var me = jsonform.getInstance();
            var htmlstr = '<ul id="jsonpanel" data-role="listview">';
            for (var i=0; i < me.jsonArray.length;i++) { 
                var obj = me.jsonArray[i];
                sessionStorage.setItem(me.vid + i, JSON.stringify(obj) );
                htmlstr += '<li><a href="#" onclick="jsonform.getInstance().showDetail(\'' + me.vid + i + '\',\'' + me.vid + 'Det\')">'; 
                htmlstr += '<h2>' + obj[displayObjects[0].Name] + '</h2>';
                if (displayObjects[1]) 
                    htmlstr += '<p><strong>' + obj[displayObjects[1].Name] + '</strong></p>';
                if (displayObjects[2]) 
                    htmlstr += '<p>' + obj[displayObjects[2].Name] + '</p>';
                if (displayObjects[3]) 
                    htmlstr += '<p class="ui-li-aside">' + obj[displayObjects[3].Name] + '</p>';
                htmlstr += '</a></li>';
            }
            htmlstr += '</ul>';
            htmlstr += '<div class="ui-corner-all ui-shadow invisible jsondetailpanel" id="jsondetail">details</div>'
            g_append(me.divID , htmlstr);
            
            $('#jsonpanel').trigger('create'); 
            //$('#jsonlistview').listview( 'refresh' );
            
        };    
        
        this.buildTable = function(displayObjects) {
            var me = jsonform.getInstance();
            //create headings
            var htmlstr = '<table data-role="table" data-mode="columntoggle" id="jsonpanel" data-mode="columntoggle" class="ui-responsive table-stripe ui-body-d ui-shadow" data-column-btn-theme="b" data-column-btn-text="Columns..." data-column-popup-theme="a" ><thead><tr>';
            if (me.mode ==='edit') htmlstr += '<th>Edit</th>';
                
            for (var i=0; i < displayObjects.length; i++) {    
                var label = displayObjects[i].Name;
                if (displayObjects[i].Label) {
                    label = displayObjects[i].Label;
                }
                htmlstr += '<th>' + label + '</th>';
            }
            htmlstr += '</tr></thead>';
            //g_append(jsontable.getInstance().divID, htmlstr);
            
            //create rows
            htmlstr += '<tbody>';
            for (var i=0; i < me.jsonArray.length;i++) { 
                htmlstr += '<tr>';
                var obj = me.jsonArray[i];
                // save to session storage for later use
                sessionStorage.setItem(me.vid + i, JSON.stringify(obj) );
                if (me.mode ==='edit') htmlstr += '<td><a href="#" onclick="jsonform.getInstance().showDetail(\'' + me.vid + i + '\',\'' + me.vid + 'Det\')" class="ui-btn ui-icon-edit ui-btn-icon-notext ui-corner-all">No text</a></td>';
                //loop through display fields to display correct columns
                for (var x=0; x < displayObjects.length; x++) { 
                    var value = obj[displayObjects[x].Name];
                    if (value === undefined) value = '';

                    if (displayObjects[x].Type === 'Text') {
                        htmlstr += '<td>' + value + '</td>';
                    } else if (displayObjects[x].Type === 'URL') {
                        htmlstr += '<td><a href="#" onclick="' + displayObjects[x].DefaultData + '(\'' + obj[displayObjects[x].RoleOnly] +  '\')">' + value + '</a></td>';
                    } else {
                        htmlstr += '<td>' + value + '</td>';
                    }
                    
                }
                htmlstr += '</tr>';
            }
            htmlstr += '</tbody></table>';
            g_append(me.divID , htmlstr);
            //$('#jsontbl').table-columntoggle( "refresh" );
        };
        
        this.buildForm = function(displayObjects){
            var me = jsonform.getInstance();
            for (var i=0; i<displayObjects.length;i++) {

                var label = displayObjects[i].Name;
                if (displayObjects[i].Label) {
                    label = displayObjects[i].Label;
                }

                var disable = "";
                var selectmenuDisable = false;
                var gray = "";

                if (displayObjects[i].ReadOnly == true) {
                    disable = 'disabled ="disabled"';
                    selectmenuDisable = true;
                    gray= '; color:black';
                }

                var fieldname = displayObjects[i].Name;
                var fieldId = jsonform.getInstance().vid + fieldname;

                if (displayObjects[i].Type == "Text") {
                    var value = jsonform.getInstance().jsonArray[displayObjects[i].Name];
                    if (value == undefined) value = "";
                    g_append(jsonform.getInstance().divID,
                            '<div class="ui-field-contain">' +
                            '    <label for="' + fieldId + '">' + label + '</label>' +
                            '      <input name="' + fieldname +'" id="' + fieldId + '" rel="' + jsonform.getInstance().vid + '"  placeholder="" value="' + value + '" type="text"'  + disable + '>' +
                            '</div>');

                } else if (displayObjects[i].Type == "DatePicker") {
                    if (jsonform.getInstance().vjson[displayObjects[i].Name]) {
                        var substringedDate = jsonform.getInstance().vjson[displayObjects[i].Name].substring(6);
                        var parsedIntDate = parseInt(substringedDate);
                        var duedate = new Date(parsedIntDate);
                        var month = duedate.getMonth() + 1;
                        var day = duedate.getDate();
                        var year = duedate.getFullYear();
                        if (month < 10) month = "0" + month;
                        if (day < 10) day = "0" + day;
                        date = year + "-" + month + "-" + day;      		               
                    } else {
                        var date = jsonform.getInstance().vjson[displayObjects[i].Name];
                    }

                    g_append(jsonform.getInstance().divID, '<div data-role="fieldcontain" class="ui-field-contain ui-body ui-br">' +
                                ' <fieldset data-role="controlgroup">' +
                                '     <label for="' + fieldId + '" class="ui-input-text leftItem">' + label + '</label>' +
                                '     <input  name="' + fieldname + '" id="' + fieldId + '" rel="' + jsonform.getInstance().vid + '" type="date"  data-role="datebox"  value="' + date + '"  class="ui-input-text ui-shadow-inset ui-corner-all ui-btn-shadow ui-body-c"  style ="width:90%" ' + disable + '  data-options=\'{"mode": "calbox", "useImmediate":true,"useButton": false, "useFocus": true, "useInlineBlind": true}\'>' +
                                '</fieldset>' +
                                '</div>');

                    $('#' + fieldId).datebox();
                    $('#' + fieldId).datebox('refresh');

                } else if (displayObjects[i].Type == "ListBox") {
                    var options = displayObjects[i].DefaultData;
                    var word = options.split(",");

                    g_append(jsonform.getInstance().divID + ' div:first','<div  data-role="fieldcontain" class="ui-field-contain ui-body ui-br">' +
                    '   <label for="' + fieldId + '" class="select  ui-select">' + label + '</label>' +
//                            '<div style ="width:115%" >' +
                    ' <select name="' + fieldname + '" id="' + fieldId + '" rel="' + jsonform.getInstance().vid + '" >' +
                     '</select></fieldset></div>');

                    for (var j = 0; j < word.length; j++) {
                        g_append('#' + fieldId, ' <option  value="' + word[j] + '">' + word[j] + '</option>');
                    }

                    $("select option").filter(function() {
                        return $(this).text().split(':')[0] == jsonform.getInstance().vjson[displayObjects[i].Name];
                    }).attr('selected', true);
                    $('#' + fieldId).selectmenu();
                    if (selectmenuDisable == true) {
                        $('#' + fieldId).selectmenu('disable');
                    }
                    $('#' + fieldId).closest('.ui-select').css('width', (displayObjects[i].Length ? displayObjects[i].Length * 16 : 500) + 'px');
                    $('#' + fieldId).selectmenu('refresh');
                }  

                if (displayObjects[i].Mandatory) {
                    $('#' + fieldId).addClass('mandatory');
                }

                //Update session object which can later be used
                $('#' + fieldId).change(function () {
                    var id = $(this).attr('rel');
                    var savedjson = JSON.parse(sessionStorage.getItem('json' + id));
                    savedjson[$(this).attr('name')] = $(this).is('select') ? $(this).attr('value').split(':')[0] : $(this).attr('value');
                    sessionStorage.setItem('json' + id, JSON.stringify(savedjson));
                });

                $('#' + fieldId).trigger('change');

            };
            //$(jsonform.getInstance().divID).appendTo( ".ui-page" ).trigger( "create" );
            $(jsonform.getInstance().divID).trigger( "create" );
            g_append(jsonform.getInstance().divID, '<div id="errorMessage"></div>');  
        };
    };
    
    return {
        getInstance: function(){
              if(!instance){
                  instance = new instanceObj; 
              }
              return instance; 
        }
    };	
})();  






