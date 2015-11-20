var vformid = '';
var vjson = '';
var vid = '';
var vsupplierid = '';
var vJsonFormOnComplete;
var jsonArray = new Array();

function JsonForm() {
	
    this.show = function (supplierid, formid, json, id) {
        //Save globals for async call's
        vJsonFormOnComplete = this.oncomplete;
        vformid = formid;
        vjson = json;
        vid = id;
        vsupplierid = supplierid;
        //session object is updated when data on screen is updated
        sessionStorage.setItem('json' + id,JSON.stringify(json));
		
        //Read displayfields
        var dao = new Dao();
        dao.openDB(function(user) {jsonformInit();});
    };
    
    this.isValid = function() {
    	
    	var isValid = true;
    	$('#errorMessage').empty();
    	
    	$(':input.mandatory').each(function() {
    		
    		if ($.trim($(this).val()) == '') {
    			$('#errorMessage').addClass('redpanel');
    			$('#errorMessage').text($(this).attr('name') + ' is a required field. Please ' + (this.tagName == 'INPUT' ? 'enter' : 'choose') + ' a value.'); 
    			isValid = false;
    			return false;
    		}
    	});
    	
        return isValid;
    };

    /*
	 * Look for our user, it it doesn't exist, call sync screen
	 */
    function jsonformInit(){
        $(vformid).empty();
        g_append(vformid, '<div class="jsonFormDiv ui-body ui-body-c"></div>');
        //$(vformid).append('<div class="ui-body ui-body-c"></div>');
        jsonformFetchDisplayFields();
     
    }

    /*
	 * fetch display fields from the database
	 */
    function jsonformFetchDisplayFields() {	    
        var dao = new Dao();
       $(this.formid).empty();
        jsonArray.splice(0, jsonArray.length);
        dao.index('DisplayFields',vid, 'ID',
				jsonformDisplayFieldsOnSuccessRead,
				undefined,
				function (event) {
        	
        			if (!jsonArray.length)
        				jsonArray = g_getDefaultDisplayFieldsById(vid);
        			
				    jsonformDisplayFieldOnComplete();
				    $(this.htmlid).listview('refresh');
				    if (vJsonFormOnComplete != undefined) {
				        vJsonFormOnComplete();
				    }
				});
    };	
	
    /*
	 * 
	 */
    function jsonformDisplayFieldsOnSuccessRead(displayfield) {
        if (displayfield.Visible == true) {
            jsonArray.push(displayfield);
        }
    }
	
    function jsonformDisplayFieldOnComplete() {                
        
        var displayObjects = new Object();
        displayObjects = jsonArray.sort(function (a, b) { return parseFloat(a.SortOrder) - parseFloat(b.SortOrder); });

        var activePageTranslation = translation();
        activePageTranslation.safeExecute(function() {
            
        for (var i=0; i<displayObjects.length;i++) {        	            
            
            var label = activePageTranslation.translateText(displayObjects[i].Label || displayObjects[i].Name);
            
            var disable = "";
            var selectmenuDisable = false;
            var gray = "";

                if (displayObjects[i].ReadOnly == true) {
                	
                    disable = 'disabled ="disabled"';
                    selectmenuDisable = true;
                    gray= '; color:black';
        		}
               
                var fieldname = displayObjects[i].Name;
                var fieldId = vid + fieldname;
                
        		if (fieldname != "Discount" && fieldname != "Nett" && fieldname != "Gross") {

        		    if (displayObjects[i].Type == "Text") {
        		    	var value = vjson[displayObjects[i].Name];
        		    	if (value == undefined) value = "";
        		        g_append(vformid + ' div:first','<div data-role="fieldcontain" class="ui-field-contain ui-body ui-br">' +
                                            '    <label for="' + fieldId + '" class="ui-input-text leftItem">' + label + '</label>' +
                                            '      <input name="' + fieldname +'" id="' + fieldId + '" rel="' + vid + '"  placeholder="" value="' + value + '" type="text" class="ui-input-text ui-shadow-inset ui-corner-all ui-btn-shadow ui-body-c " style ="width:70%' + gray + '"' + disable + '>' +
                                            '</div>');
        		        
        		    } else if (displayObjects[i].Type == "DatePicker") {
        		    	
    		            if (vjson[displayObjects[i].Name]) {
    		                var substringedDate = vjson[displayObjects[i].Name].substring(6);
    		                var parsedIntDate = parseInt(substringedDate);
    		                var duedate = new Date(parsedIntDate);
    		                var month = duedate.getMonth() + 1;
    		                var day = duedate.getDate();
    		                var year = duedate.getFullYear();
    		                if (month < 10) month = "0" + month;
    		                if (day < 10) day = "0" + day;
    		                date = year + "-" + month + "-" + day;      		               
    		            } else {
    		                var date = vjson[displayObjects[i].Name];
    		            }
    		         
    		            g_append(vformid + ' div:first', '<div data-role="fieldcontain" class="ui-field-contain ui-body ui-br">' +
                                ' <fieldset data-role="controlgroup">' +
                                           '     <label for="' + fieldId + '" class="ui-input-text leftItem">' + label + '</label>' +
                                           '     <input  name="' + fieldname + '" id="' + fieldId + '" rel="' + vid + '" type="date"  data-role="datebox"  value="' + date + '"  class="ui-input-text ui-shadow-inset ui-corner-all ui-btn-shadow ui-body-c"  style ="width:90%" ' + disable + '  data-options=\'{"mode": "calbox", "useImmediate":true,"useButton": false, "useFocus": true, "useInlineBlind": true}\'>' +
                                         '</fieldset>' +
                                           '</div>');

    		            $('#' + fieldId).datebox();
    		            $('#' + fieldId).datebox('refresh');
    		            
        		    } else if (displayObjects[i].Type == "ListBox") {
                                
                                var options = displayObjects[i].DefaultData;

                                if ((displayObjects[i].Name === 'DeliveryMethod') &&  (DaoOptions.getValue('DeliveryMethodPerBranch') === 'true'))
                                    options = DaoOptions.getValue('DeliveryMethod_' + g_currentCompany().BranchID, options);                                
        		    	
                                var word = options.split(",");

                                g_append(vformid + ' div:first','<div  data-role="fieldcontain" class="ui-field-contain ui-body ui-br">' +
                                '   <label for="' + fieldId + '" class="select  ui-select">' + label + '</label>' +
    //                            '<div style ="width:115%" >' +
                                ' <select name="' + fieldname + '" id="' + fieldId + '" rel="' + vid + '" >' +
                                 '</select></fieldset></div>');

                                for (var j = 0; j < word.length; j++) {
                                    g_append('#' + fieldId, ' <option  value="' + word[j] + '">' + word[j] + '</option>');
                                }

                                $("select option").filter(function() {
                                    return $(this).text().split(':')[0] == vjson[displayObjects[i].Name];

                                }).attr('selected', true);
                                $('#' + fieldId).selectmenu();
                                if (selectmenuDisable == true) {
                                    $('#' + fieldId).selectmenu('disable');
                                }

    //    		            $('#' + fieldId).closest('.ui-select').css('width', (displayObjects[i].Length ? displayObjects[i].Length * 16 + 'px' : '90%'));

    //    		            $('#' + fieldId).selectmenu('refresh');
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
                            
                            $('#' + fieldId).keydown(function(event) {
                                
                                return isChangeCalculationSet(this) ? g_isValidQuantityCharPressed(event, true) : true;                                                              
                            });
                            
                            $('#' + fieldId).keyup(function() {
                               
                                if (isChangeCalculationSet(this)) {

                                    var change = (Number($(this).val()) - g_shoppingCartTotalIncl).toFixed(2);
                                     $('#' + $(this).attr('rel') + DaoOptions.getValue('CalcChangeInto')).val(change).trigger('change');
                                }                               
                            });                            
        		    
        		    $('#' + fieldId).trigger('change');
        		};
        	};
        	
        	g_append(vformid + ' div:first', '<div id="errorMessage"></div>');
                
                function isChangeCalculationSet(element) {
                    
                    return (DaoOptions.getValue('CalcChange') === 'true') && (DaoOptions.getValue('CalcAmntEntered') === $(element).attr('name'));
                }
            });
    }
}