
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
        this.settingsMainDiv = '';
        this.currentDisplayField = {};
        
        /*
         * 
         * @param {type} supplierid
         * @param {type} divID = id of div field to put table
         * @param {type} jsonarray = array with data
         * @param {type} id = Displayfield ID
         * @param {type} keyField = for 
         * @returns {undefined}
         */
        this.show = function (divID, jsonarray, id, keyField, mode, type, oncomplete) {
            //Save globals for async call's
            this.vJsonFormOnComplete = oncomplete;
            this.divID = '#' + divID;
            this.jsonArray = jsonarray;
            this.vid = id;
            this.keyField = keyField;
            this.displayfields = new Array();
            this.mode = mode;
            this.type = type;
            this.settingsReturnDiv = '';
            this.detailReturnID;
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
         * For settings fetch display fields from the server
         * @returns {undefined}
         */
        this.fetchSettings = function(settingsReturnDiv) {
            var me = jsonform.getInstance();
            me.settingsReturnDiv = settingsReturnDiv;
            var url = g_restUrl + 'DisplayFields/GetCollection?supplierID=[supplierid]&id=' + me.vid + '&skip=0&top=200&format=json';
            g_ajaxget(url, this.fetchSettingsOnSuccess, this.fetchSettingsOnError);        
        };
        
        
        this.fetchSettingsOnSuccess = function (json) {
            if (json.length === 0) {
                jsonform.getInstance().fetchSettingsOnError();
                return;
            }
            jsonform.getInstance().displayfields = json;
            jsonform.getInstance().fetchSettingsOnComplete();
        };       
        
        /*
         * No local display fields so see if we have defaults defined.
         * If no defaults then build display fields from the object.
         */
        this.fetchSettingsOnError = function(){
            try {
                var me = jsonform.getInstance();
                //get defaults
                jsonform.getInstance().displayfields = g_getDefaults(jsonform.getInstance().vid); 
                //if no defaults, then build generic display fields from object
                if (!jsonform.getInstance().displayfields) {
                    var obj = (me.jsonArray instanceof Array) ? me.jsonArray[0]: me.jsonArray;
                    me.displayfields = new Array();
                    me.addDisplayFields(obj,true);
                }
                me.fetchSettingsOnComplete();
            } catch (err){
                alert('Error on fetchDisplayFieldsOnError ' + err.message);
            }
        };
        
        /*
         *  
         */
        this.fetchSettingsOnComplete = function () {
            //fill the form
            var me = jsonform.getInstance();
            var htmlstr = "";
            for (var i=0; i < me.displayfields.length; i++) {   
                htmlstr += '<option value="' + me.displayfields[i].Name + '">' + me.displayfields[i].Name + '</option>';
            }
            $('#fieldsel').empty();
            g_append('#fieldsel' , htmlstr);
            $( "#fieldsel" ).selectmenu( "refresh" );
            me.fieldselOnClick();
            me.bindSettings();
            $('#jsontable').addClass('invisible');
            $('#jsonform').addClass('invisible');
            $('#jsondetailbuttons').addClass('invisible');
            $('#jsonsettings').removeClass('invisible');  
            g_busy(false);
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
            if (displayfield.Visible === true || displayfield.Visible === '1') {
                jsonform.getInstance().displayfields.push(displayfield);
            }
        };
        
        
        /*
         * No local display fields so see if we have defaults defined
         */
        this.fetchDisplayFieldsOnError = function(){
            try {
                var me = jsonform.getInstance();
                jsonform.getInstance().displayfields = g_getDefaults(jsonform.getInstance().vid);
                if (jsonform.getInstance().displayfields) return;
                
                //No default fields so generate display fields
                var obj = (me.jsonArray instanceof Array) ? me.jsonArray[0]: me.jsonArray;
                
                me.displayfields = new Array();
                me.addDisplayFields(obj,true);
            } catch (err){
                alert('Error on fetchDisplayFieldsOnError ' + err.message);
            }
        };
        
        /*
         * Add display fields from an object.
         * Where displayfields do already exist, only add fields that dont already exist
         * @param {type} obj - the object used to get displayfields from 
         * @param {type} newlist - true if not existing displayfields
         * @returns {undefined}
         */
        this.addDisplayFields = function(obj){
            var me = jsonform.getInstance();
            var x = 0;
            for (var prop in obj) {
                //check if this display field already already exists in me.displayfields 
                var foundarray = $.grep(me.displayfields, function(v) { return v.name === prop;});
                if (foundarray.length > 0) continue;
                
                //build new Displayfield
                var df = {};
                df.Name = prop;
                df.ReadOnly = false;
                df.RoleOnly = false;
                df.SortOrder = x; 
                df.Type = 'Text';
                df.Visible = true; //if building brand new list, then default first 5 fields to visible
                df.AdminOnly = false;
                df.ID = me.vid;
                df.Label = '';
                df.Mandatory = false;
                me.displayfields.push(df);
                x++;
                if (x > 5) return; //only show first 5 fields if no displayfields
            }
        };
        
        
        /*
         * 
         */
        this.fetchDisplayFieldsOnComplete = function () {
            var me = jsonform.getInstance();
            var displayObjects = new Object();
            displayObjects = me.displayfields.sort(function (a, b) { return parseFloat(a.SortOrder) - parseFloat(b.SortOrder); });
            //me.addDisplayField()
            
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
            $('#jsontable').addClass('invisible');
            $('#jsonsettings').addClass('invisible');
            $('#jsondetail').removeClass('invisible');
            me.detailReturnID = me.vid; //keep this for later
            
            var obj = JSON.parse(sessionStorage.getItem(key));
            me.show('jsondetailcontent', obj, id, '', me.mode, 'form');
        };
        
        this.hideDetail = function(){
            var me = jsonform.getInstance();  
            me.vid = me.detailReturnID;
            $('#jsontable').removeClass('invisible');
            $('#jsondetail').addClass('invisible');
        };
        
        this.hideSettings = function(){
            var me = jsonform.getInstance(); 
            $('#jsonsettings').addClass('invisible');
            $('#' + me.settingsReturnDiv).removeClass('invisible');
            $('#jsondetailbuttons').removeClass('invisible');
        };
        
        this.showSettings = function(settingsReturnDiv){
            g_busy(true);
            jsonform.getInstance().fetchSettings(settingsReturnDiv); 
        };
        
        this.bindSettings = function(){
            $('#savesettingsbtn').unbind();
            $('#savesettingsbtn').click(function () {
                jsonform.getInstance().saveDisplayFields();
            });
        };
        
        this.saveDisplayFields = function(){
            var me = jsonform.getInstance();
            var url = g_url + 'displayfields/help/operations/ModifyAll';
            g_ajaxpost(me.displayfields,url, me.saveOnSuccess, me.saveOnError);
        };
        
        this.saveOnSuccess = function (){
            alert('saved');
        };
        
        this.saveOnError = function (err){
            alert('oh now');
        };
        
        this.fieldselOnClick = function(){
            var me = jsonform.getInstance();
            var selectedStr = $('#fieldsel').val();
            //Load display field
            for (var i=0; i < me.displayfields.length; i++) { 
                if (me.displayfields[i].Name !== selectedStr) continue;
                   
                me.currentDisplayField = me.displayfields[i]; //remember for saving
                $('#Label').val(me.displayfields[i].Label);
                $('#Length').val(me.displayfields[i].Length);
                $('#SortOrder').val(me.displayfields[i].SortOrder);
                $('#Visible').prop( 'checked', (me.displayfields[i].Visible) ? true : false ).checkboxradio('refresh');

                $('#Type option').removeAttr('selected');
                $('#Type option[value=\'' + me.displayfields[i].Type + '\']' ).attr('selected', 'selected');
                $( '#Type' ).selectmenu( 'refresh' );
                
                break;
            }
        };
        
        this.fieldselOnChange = function(id){
            var me = jsonform.getInstance();
            var df = me.currentDisplayField;
            var id = '#' + id;
            var val;
            if ($(id).is(':checkbox')) {
                if ($(id).is(':checked'))
                    val = true;
                else
                    val = false;
            } else {
                val = $(id).val();
            }
            df[id.replace('#','')] = val;
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
            htmlstr += jsonDetailPanel;
            htmlstr += jsonSettingPanel;
            g_append(me.divID , htmlstr);
            
            $('#jsonpanel').trigger('create');
            $('#jsonsettings').trigger('create');
        }; 
        
        /*
         * Build a generic table 
         */
        this.buildTable = function(displayObjects) {
            var me = jsonform.getInstance();
            //create headings
            var htmlstr = '<div id="jsontable">';
            if (me.mode ==='edit') htmlstr += '<a id="newbtn" onclick="jsonform.getInstance().hideDetail()" href="#" class="ui-btn ui-icon-plus ui-btn-icon-left ui-btn-inline ui-corner-all">New</a>'; 
            if (g_currentUser().IsAdmin) htmlstr += '<a id="showsettingsbtn" href="#" onclick="jsonform.getInstance().showSettings(\'jsontable\')" class="ui-btn ui-icon-gear ui-btn-icon-left ui-btn-inline ui-corner-all">Settings</a>';                
        
            htmlstr += '<table data-role="table" data-mode="columntoggle" id="jsontable" data-mode="columntoggle" class="ui-responsive table-stripe ui-body-d ui-shadow" data-column-btn-theme="b" data-column-btn-text="Columns..." data-column-popup-theme="a" ><thead><tr>';
            if (me.mode ==='edit') htmlstr += '<th>Edit</th>';
                
            for (var i=0; i < displayObjects.length; i++) {    
                var label = displayObjects[i].Name;
                if (displayObjects[i].Label) {
                    label = displayObjects[i].Label;
                }
                // TEST
                if ('UserField10' ==  displayObjects[i].Name)
                    label = 'Error';
                
                htmlstr += '<th>' + label + '</th>';
            }
            htmlstr += '</tr></thead>';
            
            //create rows
            htmlstr += '<tbody>';
            for (var i=0; i < me.jsonArray.length;i++) { 
                
                var obj = me.jsonArray[i];
                if (obj.hidden) {
                    
                    delete obj.hidden;
                    continue;
                }
                
                htmlstr += '<tr>';
                // save to session storage for later use
                sessionStorage.setItem(me.vid + i, JSON.stringify(obj) );
                if (me.mode ==='edit') htmlstr += '<td><a href="#" onclick="jsonform.getInstance().showDetail(\'' + me.vid + i + '\',\'' + me.vid + 'Det\')" class="ui-btn ui-icon-edit ui-btn-icon-notext ui-corner-all">No text</a></td>';
                //loop through display fields to display correct columns
                for (var x=0; x < displayObjects.length; x++) { 
                    var name = displayObjects[x].Name;
                    var value = obj[name];
                    if (value === undefined) value = '';

                    if (displayObjects[x].Type === 'Text') {
                        htmlstr += '<td>' + value + '</td>';
                    } else if (displayObjects[x].Type === 'URL') {
                        htmlstr += '<td><a href="#" onclick="' + displayObjects[x].DefaultData + '(\'' + obj[displayObjects[x].RoleOnly] +  '\')">' + value + '</a></td>';
                    } else if (displayObjects[x].Type === 'CheckBox') {
                        //htmlstr += '<td><a href="#" onclick="' + displayObjects[x].DefaultData + '(\'' + obj[displayObjects[x].RoleOnly] +  '\')">' + value + '</a></td>';
                        htmlstr += '<td><fieldset data-role="controlgroup" data-type="horizontal">' +
                                    '        <input type="checkbox" id="' + name + '">' +
                                    '        <label for="' + name + '">' + value + '</label>' +
                                    '</fieldset></td>';
                    } else {
                        htmlstr += '<td>' + value + '</td>';
                    }
                    
                }
                htmlstr += '</tr>';
            }
            htmlstr += '</tbody></table></div>';
            htmlstr += jsonDetailPanel;
            htmlstr += jsonSettingPanel;

            g_append(me.divID , htmlstr);
            $('#jsonsettings').trigger('create');
            $('#jsondetail').trigger('create');
            
            if (me.vJsonFormOnComplete) this.vJsonFormOnComplete();
            
            //$('#jsontbl').table-columntoggle( "refresh" );
        };
        
        this.buildForm = function(displayObjects){
            var me = jsonform.getInstance();
            
            //Build initial form
            var htmlstr = '<div id="jsonform">';
            //dont add buttons for detailform
            if (me.divID !== '#jsondetailcontent'){
                if (me.mode ==='edit') htmlstr += '<a id="newbtn" onclick="jsonform.getInstance().hideDetail()" href="#" class="ui-btn ui-icon-plus ui-btn-icon-left ui-btn-inline ui-corner-all">New</a>'; 
                if (g_currentUser().IsAdmin) htmlstr += '<a id="showsettingsbtn" href="#" onclick="jsonform.getInstance().showSettings(\'jsonform\')" class="ui-btn ui-icon-gear ui-btn-icon-left ui-btn-inline ui-corner-all">Settings</a>';
            }   
            htmlstr += '</div></div>';           
            g_append(me.divID,htmlstr);
            
            for (var i=0; i<displayObjects.length;i++) {
                var label = displayObjects[i].Name;
                if (displayObjects[i].Label) {
                    label = displayObjects[i].Label;
                }

                var disable = "";
                var selectmenuDisable = false;
                var gray = "";

                if (displayObjects[i].ReadOnly === true) {
                    disable = 'disabled ="disabled"';
                    selectmenuDisable = true;
                    gray = '; color:black';
                }
 
                var fieldname = displayObjects[i].Name;
                var fieldId = jsonform.getInstance().vid + fieldname;

                if (displayObjects[i].Type === "Text") {
                    var value = jsonform.getInstance().jsonArray[displayObjects[i].Name];
                    if (value === undefined) value = "";
                    g_append('#jsonform',
                            '<div class="ui-field-contain">' +
                            '    <label for="' + fieldId + '">' + label + '</label>' +
                            '      <input name="' + fieldname +'" id="' + fieldId + '" rel="' + me.vid + '"  placeholder="" value="' + value + '" type="text"'  + disable + '>' +
                            '</div>');

                } else if (displayObjects[i].Type === "DatePicker") {
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

                    g_append('#jsonform', '<div data-role="fieldcontain" class="ui-field-contain ui-body ui-br">' +
                                ' <fieldset data-role="controlgroup">' +
                                '     <label for="' + fieldId + '" class="ui-input-text leftItem">' + label + '</label>' +
                                '     <input  name="' + fieldname + '" id="' + fieldId + '" rel="' + me.vid + '" type="date"  data-role="datebox"  value="' + date + '"  class="ui-input-text ui-shadow-inset ui-corner-all ui-btn-shadow ui-body-c"  style ="width:90%" ' + disable + '  data-options=\'{"mode": "calbox", "useImmediate":true,"useButton": false, "useFocus": true, "useInlineBlind": true}\'>' +
                                '</fieldset>' +
                                '</div>');

                    $('#' + fieldId).datebox();
                    $('#' + fieldId).datebox('refresh');

                } else if (displayObjects[i].Type === "ListBox") {
                    
                    var options = displayObjects[i].DefaultData;
                    
                    if ((displayObjects[i].Name === 'DeliveryMethod') &&  (DaoOptions.getValue('DeliveryMethodPerBranch') === 'true'))
                        options = DaoOptions.getValue('DeliveryMethod_' + g_currentCompany().BranchID, options);
                    
                    var word = options.split(",");

                    g_append('#jsonform' + ' div:first','<div  data-role="fieldcontain" class="ui-field-contain ui-body ui-br">' +
                    '   <label for="' + fieldId + '" class="select  ui-select">' + label + '</label>' +
//                            '<div style ="width:115%" >' +
                    ' <select name="' + fieldname + '" id="' + fieldId + '" rel="' + me.vid + '" >' +
                     '</select></fieldset></div>');

                    for (var j = 0; j < word.length; j++) {
                        g_append('#' + fieldId, ' <option  value="' + word[j] + '">' + word[j] + '</option>');
                    }

                    $("select option").filter(function() {
                        return $(this).text().split(':')[0] === me.vjson[displayObjects[i].Name];
                    }).attr('selected', true);
                    $('#' + fieldId).selectmenu();
                    if (selectmenuDisable === true) {
                        $('#' + fieldId).selectmenu('disable');
                    }
                    $('#' + fieldId).closest('.ui-select').css('width', (me.displayObjects[i].Length ? me.displayObjects[i].Length * 16 : 500) + 'px');
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