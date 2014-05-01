var ccusers = '[{"Name":"UserID","ReadOnly":true,"RoleOnly":"","SortOrder":1,"Type":"TextBox","Visible":true,"AdminOnly":false,"DefaultData":null,"ID":"ccusers","Label":"","Length":null,"Mandatory":null},' +
                '{"Name":"Name","ReadOnly":true,"RoleOnly":"","SortOrder":1,"Type":"TextBox","Visible":true,"AdminOnly":false,"DefaultData":null,"ID":"ccusers","Label":"","Length":null,"Mandatory":null}]'; 
                //'{"Name":"Email","ReadOnly":true,"RoleOnly":"","SortOrder":1,"Type":"TextBox","Visible":true,"AdminOnly":false,"DefaultData":null,"ID":"ccusers","Label":"","Length":null,"Mandatory":null}]';

var ccusersDet = '[{"Name":"UserID","ReadOnly":false,"RoleOnly":"","SortOrder":1,"Type":"Text","Visible":true,"AdminOnly":false,"DefaultData":null,"ID":"ccusers","Label":"","Length":null,"Mandatory":null},' +
                '{"Name":"Name","ReadOnly":false,"RoleOnly":"","SortOrder":2,"Type":"Text","Visible":true,"AdminOnly":false,"DefaultData":null,"ID":"ccusers","Label":"","Length":null,"Mandatory":null},' + 
                '{"Name":"Email","ReadOnly":false,"RoleOnly":"","SortOrder":3,"Type":"Text","Visible":true,"AdminOnly":false,"DefaultData":null,"ID":"ccusers","Label":"","Length":null,"Mandatory":null}]';

var jsonSettingPanel = '<div data-role="content" id="jsonsettings" class="invisible" style="padding: 10px;">' +
                        '<a id="settingsbackbtn" onclick="jsonform.getInstance().hideSettings()" href="#" class="ui-btn ui-icon-back ui-btn-icon-left ui-corner-all ui-btn-inline">Back</a>' +
                        '<div data-role="fieldcontain" data-controltype="selectmenu">' +
                        '    <label for="fieldsel">' +
                        '        Field:' +
                        '    </label>' +
                        '    <select onchange="jsonform.getInstance().fieldselOnClick()" id="fieldsel" name="">' +
                        '    </select>' +
                        '</div>' +
                        '<div data-role="fieldcontain" data-controltype="textinput">' +
                        '    <label for="Label">' +
                        '        Label' +
                        '    </label>' +
                        '    <input onchange="jsonform.getInstance().fieldselOnChange(\'Label\')" name="" id="Label" placeholder="" value="" type="text">' +
                        '</div>' +
                        '<input  onchange="jsonform.getInstance().fieldselOnChange(\'Visible\')" type="checkbox" name="Visible" id="Visible"/>' +
                        '<label for="Visible">Visible</label>' +
                        '<div  onchange="jsonform.getInstance().fieldselOnChange(\'Type\')" data-role="fieldcontain" data-controltype="selectmenu">' +
                        '    <label for="Type">' +
                        '        Type:' +
                        '    </label>' +
                        '    <select id="Type" name="">' +
                        '        <option value="Text" id="Text">Text</option>' +
                        '        <option value="ListBox" id="ListBox">ListBox</option>' +
                        '    </select>' +
                        '</div>' +
                        '<div  onchange="jsonform.getInstance().fieldselOnChange(\'Length\')" data-role="fieldcontain" data-controltype="textinput">' +
                        '    <label for="Length">' +
                        '        Length' +
                        '    </label>' +
                        '    <input name="" id="Length" placeholder="" value="" type="number">' +
                        '</div>' +
                        '<div  onchange="jsonform.getInstance().fieldselOnChange(\'SortOrder\')" data-role="fieldcontain" data-controltype="textinput">' +
                        '    <label for="SortOrder">' +
                        '        Sort Order' +
                        '    </label>' +
                        '    <input name="" id="SortOrder" placeholder="" value="" type="number">' +
                        '</div>' +
                        '<a id="savesettingsbtn" href="#" class="ui-btn ui-btn-c">Save</a>' +
                        '</div>';

var jsonDetailPanel = '<div class="ui-corner-all ui-shadow invisible" id="jsondetail">' + 
                        '   <div id="jsondetailbuttons">' +
                        '       <a id="detailbackbtn" onclick="jsonform.getInstance().hideDetail()" href="#" class="ui-btn ui-icon-back ui-btn-icon-left ui-corner-all ui-btn-inline">Back</a>' +
                        '       <a id="detailsavebtn" onclick="" href="#" class="ui-btn ui-icon-plus ui-btn-icon-left ui-corner-all ui-btn-inline">Save</a>' +
                        '       <a id="showsettingsbtn" href="#" onclick="jsonform.getInstance().showSettings(\'jsonform\')" class="ui-btn ui-icon-gear ui-btn-icon-left ui-btn-inline ui-corner-all">Settings</a>' +
                        '   </div>' +
                        '   <div id="jsondetailcontent"></div>' +
                        '</div>';