function createId() {
	
    var date = new Date();
    var onejan = new Date(date.getFullYear(), 0, 1);
    var yy = date.getFullYear().toString().slice(2);
    var JJJ = g_dayOfYear();
    var dd = g_setLeadingZero(date.getDate());
    var hh = g_setLeadingZero(date.getHours());
    var mm = g_setLeadingZero(date.getMinutes());
    var ss = g_setLeadingZero(date.getSeconds());
    var rr = g_setLeadingZero(Math.floor(Math.random()*100));
    
    return yy+JJJ+dd+hh+mm+ss+rr;
}