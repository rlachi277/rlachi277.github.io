import "../style.css";

import { $ } from "../../../query.js";

var x = window.setInterval(wait_for_exact,6);
function wait_for_exact() {
	let a=(new Date().getMilliseconds())%100;
	if (a>=2&&a<=10) {
		window.setInterval(update,100);
		window.setTimeout(load,105);
		window.clearInterval(x);
	}
}

function load() {
	$(":root").css("--dark-color","#DBCFBF");
	$(":root").css("--darker-color","#C2B7A9");
	$(":root").css("--darkest-color","#403C38");
}

function pad_zero(s: number | string,z: number) {
	let ss=s.toString();
	while (ss.length<z) {
		ss="0"+ss;
	}
	return ss;
}

var long_time=new Date(2024,10-1,7,8,40,0,0).getTime();
var freedom_time_d=new Date();
freedom_time_d.setDate(
	freedom_time_d.getDate() + (7 - freedom_time_d.getDay() + 5) % 7
);
freedom_time_d.setHours(17);
freedom_time_d.setMinutes(0);
freedom_time_d.setSeconds(0);
freedom_time_d.setMilliseconds(0);
var freedom_time = freedom_time_d.getTime();
function update() {
	let now = new Date();
	let tar = Math.round((freedom_time - now.getTime())/100);
	let vtar = Math.round((long_time - now.getTime())/100);
	set_time(now, [Math.floor(tar/36000),Math.floor(tar/600)%60,(tar/10)%60]);
	$("#vacation-timer-text").text(`${pad_zero(Math.floor(vtar/36000),4)}:${pad_zero(Math.floor(vtar/600)%60,2)}:${pad_zero(Math.floor(vtar/10)%60,2)}`);
}

var advance_seconds=[421200,405000,382500,318600,296100,232200,209700,145800,123300,59400,36900,0];
var sunday_before_year_d = new Date(new Date().getFullYear(),0,0);
var sunday_before_year = sunday_before_year_d.getTime() - sunday_before_year_d.getDay()*86400000;
function set_time(now: Date, time: [number,number,number]) {
	if (time[0]>=117) {
		time=[117,0,0];
	} else if (time[0]<0) {
		time=[0,0,0];
	}
	
	let seconds_left=time[0]*3600+time[1]*60+time[2];
	$("#second-display-text").text(Math.floor(seconds_left).toString());
	$("#day-display-text").text(`${Math.floor(time[0]/24)};${time[0]%24}`);
	$("#hour-progress-fg").css("width",`${100-(time[1]/60+time[2]/3600)*100}%`)
	
	let entire_progress=100-(seconds_left)/421200*100;
	let ep_shard=pad_zero(Math.floor(entire_progress*1000).toString(),4);
	$("#entire-past-bar").css("width",`${entire_progress}%`);
	$("#entire-cursor").css("left",`${entire_progress}%`);
	$("#entire-progress").css("left",`${entire_progress}%`);
	$("#entire-progress").text(`${ep_shard.slice(0,-3)+"."+ep_shard.slice(-3)}%`);
	
	if (seconds_left>=421000) {
		$(".entire-circle").removeClass("circle-past");
		$("#section-circle").removeClass("circle-dark-before");
		$("#section-circle").removeClass("circle-dark-after");
	}
	let i=1;
	while (seconds_left<=advance_seconds[i]) {
		$(`.entire-circle:nth-child(${i})`).addClass("circle-past");
		i++;
	}
	if (i%2==0) {
		$("#section-dark").css("width","100%");
		$("#section-circle").addClass("circle-dark-before");
		$("#section-circle").addClass("circle-dark-after");
	} else {
		$("#section-dark").css("width","0%");
		$("#section-circle").removeClass("circle-dark-before");
		$("#section-circle").removeClass("circle-dark-after");
	}
	let section_progress=0;
	if (advance_seconds[i-1]!=0) {
		section_progress=(seconds_left-advance_seconds[i-1])/(advance_seconds[i]-advance_seconds[i-1])*100
	} else {
		section_progress=100;
	}
	let sp_shard=pad_zero(Math.floor(section_progress*100).toString(),3);
	$("#section-past-bar").css("width",`${section_progress}%`);
	$("#section-cursor").css("left",`${section_progress}%`);
	$("#section-progress").css("left",`${section_progress}%`);
	$("#section-progress").text(`${sp_shard.slice(0,-2)+"."+sp_shard.slice(-2)}%`);
	
	for (i=3; i>0; i--) {
		$(`#timer${i}`).text(Math.floor(time[0]%10).toString());
		time[0]/=10;
	}
	for (i=5; i>3; i--) {
		$(`#timer${i}`).text(Math.floor(time[1]%10).toString());
		time[1]/=10;
	}
	for (i=7; i>5; i--) {
		$(`#timer${i}`).text(Math.floor(time[2]%10).toString());
		time[2]/=10;
	}
	
	$("#date-display").text(`${now.getFullYear()}-${pad_zero(now.getMonth()+1, 2)}-${pad_zero(now.getDate(), 2)}`);
	let sunday_this_week = now.getTime()-(now.getDay()*86400000);
	let diff = (sunday_this_week - sunday_before_year);
	let oneWeek = 1000 * 60 * 60 * 24 * 7;
	let week = Math.floor(diff / oneWeek);
	$("#week-display").text(`${week-8}주차`);
}