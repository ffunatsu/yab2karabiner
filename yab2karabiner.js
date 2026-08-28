#!/usr/bin/env node

/**
 * yab2karabiner
 * 
 * やまぶきRの設定ファイル(*.yab)をおおよそKarabiner-ElementsのJSONにするやーつ
 * 
 * 移植元: Yama2Kara (https://potting.syuriken.jp/webApps/Yama2Kara/index.html)
 * 作成者: potting (https://potting.syuriken.jp/)
 */

const fs = require('fs');
const path = require('path');

class KarabinerModifiers {
	constructor(mandatory, optional) {
		this.mandatory = mandatory;
		this.optional = optional;
	}
}

class KarabinerKey {
	constructor(key_code) {
		this.key_code = key_code;
	}
}

class KarabinerFrom {
	constructor(key_code, modifiers, simultaneous) {
		this.key_code = key_code;
		this.modifiers = modifiers;
		this.simultaneous = simultaneous;
	}
}

class KarabinerTo {
	constructor(key_code, modifiers) {
		this.key_code = key_code;
		this.modifiers = modifiers;
	}
}

class KarabinerSetVar {
	constructor(name, value) {
		this.name = name;
		this.value = value;
	}
}

class KarabinerSetPrefixNo {
	constructor(prefixNo) {
		this.set_variable = new KarabinerSetVar("prefixNo", prefixNo);
	}
}

class KarabinerConditionInputSource {
	constructor(language) {
		this.language = language;
	}
}

class KarabinerConditionInputSourceJp extends KarabinerConditionInputSource {
	constructor() {
		super("ja");
	}
}

class KarabinerConditionInputSources {
	constructor(input_sources) {
		this.type = "input_source_if";
		this.input_sources = input_sources;
	}
}

class KarabinerConditionApplicationUnless {
	constructor(bundle_identifiers) {
		this.type = "frontmost_application_unless";
		this.bundle_identifiers = bundle_identifiers;
	}
}

class KarabinerConditionKeyboardTypes {
	constructor(types) {
		this.type = "keyboard_type_if";
		this.keyboard_types = types; // ansi/iso/jis
	}
}

class KarabinerConditionPrefixNo {
	constructor(value) {
		this.type = "variable_if";
		this.name = "prefixNo";
		this.value = value;
	}
}

class KarabinerManipulator {
	constructor(from, to, conditions) {
		this.type = "basic";
		this.from = from;
		this.to = to;
		this.conditions = conditions;
	}
}

class KarabinerRule {
	constructor(description, manipulators) {
		this.description = description;
		this.manipulators = manipulators;
	}
}

class KarabinerDefine {
	constructor(title, rules) {
		this.title = title;
		this.rules = rules;
	}
}

class YamabukiDefine {
	constructor(description, inputSource, prefixNo, thumbShift, littleShift, simShift, keySequenceTable) {
		this.description = description; // for debug
		this.inputSource = inputSource;
		this.prefixNo = prefixNo;
		this.thumbShift = thumbShift;
		this.littleShift = littleShift;
		this.simShift = simShift;
		this.keySequenceTable = keySequenceTable;
		this.sortKey = this.calcSortKey();
	}
	calcSortKey() {
		let sortKey = 0;
		if (this.inputSource == "jp") { sortKey |= 0x80000000; }
		if (this.prefixNo > 0) { sortKey |= ((50 - this.prefixNo + 1) << (4 * 6)); }
		if (this.thumbShift == "left") { sortKey |= 0x00800000; }
		else if (this.thumbShift == "right") { sortKey |= 0x00400000; }
		if (this.littleShift == true) { sortKey |= 0x00200000; }
		if (this.simShift != null) { sortKey |= 0x00100000; }
		return sortKey;
	}
}

// yama layout
const karabinerKeyNamesJp = [
	["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "hyphen", "equal_sign", "international3"],
	["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "open_bracket", "close_bracket"],
	["a", "s", "d", "f", "g", "h", "j", "k", "l", "semicolon", "quote", "backslash"],
	["z", "x", "c", "v", "b", "n", "m", "comma", "period", "slash", "international1"]
];

const karabinerKeyNamesUs = [
	["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "hyphen", "equal_sign", "grave_accent_and_tilde"],
	["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "open_bracket", "close_bracket"],
	["a", "s", "d", "f", "g", "h", "j", "k", "l", "semicolon", "quote", "backslash"],
	["z", "x", "c", "v", "b", "n", "m", "comma", "period", "slash", null ]
];

const yamaSimKeyNames = [
	["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "^", "|"],
	["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "@", "["],
	["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", ":", "]"],
	["z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "_"]
];

let yama2Kara = new Map([
	// layout.html "有効な文字"のうち、ひらがなは省略

//ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろわをんヴ、。゛゜「」ー・<br>
//！”＃＄％＆’（）＊＋，−．／０１２３４５６７８９：；＜＝＞？＠ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ［￥］＾＿｀‘ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ｛｜｝〜<br>
//逃入空後消挿上左右下家終前次無

	["１"	, [new KarabinerTo("1", undefined)]],
	["２"	, [new KarabinerTo("2", undefined)]],
	["３"	, [new KarabinerTo("3", undefined)]],
	["４"	, [new KarabinerTo("4", undefined)]],
	["５"	, [new KarabinerTo("5", undefined)]],
	["６"	, [new KarabinerTo("6", undefined)]],
	["７"	, [new KarabinerTo("7", undefined)]],
	["８"	, [new KarabinerTo("8", undefined)]],
	["９"	, [new KarabinerTo("9", undefined)]],
	["０"	, [new KarabinerTo("0", undefined)]],

	["Ａ"	, [new KarabinerTo("a", ["shift"])]],
	["Ｂ"	, [new KarabinerTo("b", ["shift"])]],
	["Ｃ"	, [new KarabinerTo("c", ["shift"])]],
	["Ｄ"	, [new KarabinerTo("d", ["shift"])]],
	["Ｅ"	, [new KarabinerTo("e", ["shift"])]],
	["Ｆ"	, [new KarabinerTo("f", ["shift"])]],
	["Ｇ"	, [new KarabinerTo("g", ["shift"])]],
	["Ｈ"	, [new KarabinerTo("h", ["shift"])]],
	["Ｉ"	, [new KarabinerTo("i", ["shift"])]],
	["Ｊ"	, [new KarabinerTo("j", ["shift"])]],
	["Ｋ"	, [new KarabinerTo("k", ["shift"])]],
	["Ｌ"	, [new KarabinerTo("l", ["shift"])]],
	["Ｍ"	, [new KarabinerTo("m", ["shift"])]],
	["Ｎ"	, [new KarabinerTo("n", ["shift"])]],
	["Ｏ"	, [new KarabinerTo("o", ["shift"])]],
	["Ｐ"	, [new KarabinerTo("p", ["shift"])]],
	["Ｑ"	, [new KarabinerTo("q", ["shift"])]],
	["Ｒ"	, [new KarabinerTo("r", ["shift"])]],
	["Ｓ"	, [new KarabinerTo("s", ["shift"])]],
	["Ｔ"	, [new KarabinerTo("t", ["shift"])]],
	["Ｕ"	, [new KarabinerTo("u", ["shift"])]],
	["Ｖ"	, [new KarabinerTo("v", ["shift"])]],
	["Ｗ"	, [new KarabinerTo("w", ["shift"])]],
	["Ｘ"	, [new KarabinerTo("x", ["shift"])]],
	["Ｙ"	, [new KarabinerTo("y", ["shift"])]],
	["Ｚ"	, [new KarabinerTo("z", ["shift"])]],

	["ａ"	, [new KarabinerTo("a", undefined)]],
	["ｂ"	, [new KarabinerTo("b", undefined)]],
	["ｃ"	, [new KarabinerTo("c", undefined)]],
	["ｄ"	, [new KarabinerTo("d", undefined)]],
	["ｅ"	, [new KarabinerTo("e", undefined)]],
	["ｆ"	, [new KarabinerTo("f", undefined)]],
	["ｇ"	, [new KarabinerTo("g", undefined)]],
	["ｈ"	, [new KarabinerTo("h", undefined)]],
	["ｉ"	, [new KarabinerTo("i", undefined)]],
	["ｊ"	, [new KarabinerTo("j", undefined)]],
	["ｋ"	, [new KarabinerTo("k", undefined)]],
	["ｌ"	, [new KarabinerTo("l", undefined)]],
	["ｍ"	, [new KarabinerTo("m", undefined)]],
	["ｎ"	, [new KarabinerTo("n", undefined)]],
	["ｏ"	, [new KarabinerTo("o", undefined)]],
	["ｐ"	, [new KarabinerTo("p", undefined)]],
	["ｑ"	, [new KarabinerTo("q", undefined)]],
	["ｒ"	, [new KarabinerTo("r", undefined)]],
	["ｓ"	, [new KarabinerTo("s", undefined)]],
	["ｔ"	, [new KarabinerTo("t", undefined)]],
	["ｕ"	, [new KarabinerTo("u", undefined)]],
	["ｖ"	, [new KarabinerTo("v", undefined)]],
	["ｗ"	, [new KarabinerTo("w", undefined)]],
	["ｘ"	, [new KarabinerTo("x", undefined)]],
	["ｙ"	, [new KarabinerTo("y", undefined)]],
	["ｚ"	, [new KarabinerTo("z", undefined)]],

	["逃"	, [new KarabinerTo("escape", undefined)]],
	["入"	, [new KarabinerTo("return_or_enter", undefined)]],
	["空"	, [new KarabinerTo("spacebar", undefined)]],
	["後"	, [new KarabinerTo("delete_or_backspace", undefined)]],
	["消"	, [new KarabinerTo("delete_forward", undefined)]],
	["挿"	, [new KarabinerTo("insert", undefined)]],
	["上"	, [new KarabinerTo("up_arrow", undefined)]],
	["左"	, [new KarabinerTo("left_arrow", undefined)]],
	["右"	, [new KarabinerTo("right_arrow", undefined)]],
	["下"	, [new KarabinerTo("down_arrow", undefined)]],
	["家"	, [new KarabinerTo("home", undefined)]],
	["終"	, [new KarabinerTo("end", undefined)]],
	["前"	, [new KarabinerTo("page_up", undefined)]],
	["次"	, [new KarabinerTo("page_down", undefined)]],

	["機1"	, [new KarabinerTo("f1", undefined)]],
	["機2"	, [new KarabinerTo("f2", undefined)]],
	["機3"	, [new KarabinerTo("f3", undefined)]],
	["機4"	, [new KarabinerTo("f4", undefined)]],
	["機5"	, [new KarabinerTo("f5", undefined)]],
	["機6"	, [new KarabinerTo("f6", undefined)]],
	["機7"	, [new KarabinerTo("f7", undefined)]],
	["機8"	, [new KarabinerTo("f8", undefined)]],
	["機9"	, [new KarabinerTo("f9", undefined)]],
	["機10"	, [new KarabinerTo("f10", undefined)]],
	["機11"	, [new KarabinerTo("f11", undefined)]],
	["機12"	, [new KarabinerTo("f12", undefined)]],
	// ...

	//その他　
	["ゐ"	, [new KarabinerTo("w", undefined), new KarabinerTo("y", undefined), new KarabinerTo("i", undefined)]],
	["ゑ"	, [new KarabinerTo("w", undefined), new KarabinerTo("y", undefined), new KarabinerTo("e", undefined)]],
	["…"	, [new KarabinerTo("semicolon", ["option"])]],
	["―"	, [new KarabinerTo("hyphen", undefined)]],

]);

const yama2KaraJp = new Map([
	["、"	, [new KarabinerTo("comma", undefined)]],
	["。"	, [new KarabinerTo("period", undefined)]],
	//"゛"	, [new KarabinerTo("", undefined),
	//"゜"	, [new KarabinerTo("", undefined),
	["「"	, [new KarabinerTo("close_bracket", undefined)]],
	["」"	, [new KarabinerTo("backslash", undefined)]],
	["ー"	, [new KarabinerTo("hyphen", undefined)]],
	["・"	, [new KarabinerTo("slash", undefined)]],

	["！"	, [new KarabinerTo("1", ["shift"])]],
	["”"	, [new KarabinerTo("2", ["shift"])]],
	["＃"	, [new KarabinerTo("3", ["shift"])]],
	["＄"	, [new KarabinerTo("4", ["shift"])]],
	["％"	, [new KarabinerTo("5", ["shift"])]],
	["＆"	, [new KarabinerTo("6", ["shift"])]],
	["’"	, [new KarabinerTo("7", ["shift"])]],
	["（"	, [new KarabinerTo("8", ["shift"])]],
	["）"	, [new KarabinerTo("9", ["shift"])]],
	["＊"	, [new KarabinerTo("quote", ["shift"])]],
	["＋"	, [new KarabinerTo("semicolon", ["shift"])]],
	["，"	, [new KarabinerTo("comma", undefined)]],
	["−"	, [new KarabinerTo("hyphen", undefined)]],
	["．"	, [new KarabinerTo("period", undefined)]],
	["／"	, [new KarabinerTo("slash", ["option"])]],

	["："	, [new KarabinerTo("quote", undefined)]],
	["；"	, [new KarabinerTo("semicolon", undefined)]],
	["＜"	, [new KarabinerTo("comma", ["shift"])]],
	["＝"	, [new KarabinerTo("hyphen", ["shift"])]],
	["＞"	, [new KarabinerTo("period", ["shift"])]],
	["？"	, [new KarabinerTo("slash", ["shift"])]],
	["＠"	, [new KarabinerTo("open_bracket", undefined)]],

	["［"	, [new KarabinerTo("close_bracket", undefined)]],
	["￥"	, [new KarabinerTo("international3", undefined)]],
	["］"	, [new KarabinerTo("backslash", undefined)]],
	["＾"	, [new KarabinerTo("equal_sign", undefined)]],
	["＿"	, [new KarabinerTo("international1", ["shift"])]],
	["｀"	, [new KarabinerTo("open_bracket", ["shift"])]],
	["‘"	, [new KarabinerTo("open_bracket", ["shift"])]],

	["｛"	, [new KarabinerTo("close_bracket", ["shift"])]],
	["｜"	, [new KarabinerTo("international3", ["shift"])]],
	["｝"	, [new KarabinerTo("backslash", ["shift"])]],
	["〜"	, [new KarabinerTo("equal_sign", ["shift"])]],

	// for Thuki
	["－"	, [new KarabinerTo("hyphen", undefined)]],
	["～"	, [new KarabinerTo("equal_sign", ["shift"])]],

]);

const yama2KaraUs = new Map([
	["、"	, [new KarabinerTo("comma", undefined)]],
	["。"	, [new KarabinerTo("period", undefined)]],
	//"゛"	, [new KarabinerTo("", undefined),
	//"゜"	, [new KarabinerTo("", undefined),
	["「"	, [new KarabinerTo("open_bracket", undefined)]],
	["」"	, [new KarabinerTo("close_bracket", undefined)]],
	["ー"	, [new KarabinerTo("hyphen", undefined)]],
	["・"	, [new KarabinerTo("slash", undefined)]],

	["！"	, [new KarabinerTo("1", ["shift"])]],
	["”"	, [new KarabinerTo("quote", ["shift"])]],
	["＃"	, [new KarabinerTo("3", ["shift"])]],
	["＄"	, [new KarabinerTo("4", ["shift"])]],
	["％"	, [new KarabinerTo("5", ["shift"])]],
	["＆"	, [new KarabinerTo("7", ["shift"])]],
	["’"	, [new KarabinerTo("quote", undefined)]],
	["（"	, [new KarabinerTo("9", ["shift"])]],
	["）"	, [new KarabinerTo("0", ["shift"])]],
	["＊"	, [new KarabinerTo("8", ["shift"])]],
	["＋"	, [new KarabinerTo("equal_sign", ["shift"])]],
	["，"	, [new KarabinerTo("comma", undefined)]],
	["−"	, [new KarabinerTo("hyphen", undefined)]],
	["．"	, [new KarabinerTo("period", undefined)]],
	["／"	, [new KarabinerTo("slash", ["option"])]],

	["："	, [new KarabinerTo("semicolon", ["shift"])]],
	["；"	, [new KarabinerTo("semicolon", undefined)]],
	["＜"	, [new KarabinerTo("comma", ["shift"])]],
	["＝"	, [new KarabinerTo("equal_sign", undefined)]],
	["＞"	, [new KarabinerTo("period", ["shift"])]],
	["？"	, [new KarabinerTo("slash", ["shift"])]],
	["＠"	, [new KarabinerTo("2", ["shift"])]],

	["［"	, [new KarabinerTo("open_bracket", undefined)]],
	["￥"	, [new KarabinerTo("backslash", undefined)]],
	["］"	, [new KarabinerTo("close_bracket", undefined)]],
	["＾"	, [new KarabinerTo("6", ["shift"])]],
	["＿"	, [new KarabinerTo("hyphen", ["shift"])]],
	["｀"	, [new KarabinerTo("grave_accent_and_tilde", undefined)]],
	["‘"	, [new KarabinerTo("grave_accent_and_tilde", undefined)]],

	["｛"	, [new KarabinerTo("open_bracket", ["shift"])]],
	["｜"	, [new KarabinerTo("backslash", ["shift"])]],
	["｝"	, [new KarabinerTo("close_bracket", ["shift"])]],
	["〜"	, [new KarabinerTo("grave_accent_and_tilde", ["shift"])]],

	// for Thuki
	["－"	, [new KarabinerTo("hyphen", undefined)]],
	["～"	, [new KarabinerTo("grave_accent_and_tilde", ["shift"])]],

]);

const yama2KaraModifiers = new Map([
	["C", "left_control"],
	["S", "shift"],
	["A", "left_option"],
	["W", "left_command"],
]);

const processYab2Json = (title, inputText, keyboardLayout, thumbKey) => {
	const inputDefines = new Map();
	const defaultCondition = [];

	let karabinerKeyNames;
	if (keyboardLayout == "JP") {
		karabinerKeyNames = karabinerKeyNamesJp;
		yama2KaraJp.forEach((value, key) => {
			yama2Kara.set(key, value);
		});
		//yama2Kara = {...yama2KaraJp};
		defaultCondition.push(new KarabinerConditionKeyboardTypes(["jis"]));
	} else {
		karabinerKeyNames = karabinerKeyNamesUs;
		yama2KaraUs.forEach((value, key) => {
			yama2Kara.set(key, value);
		});
		//yama2Kara = {...yama2KaraUs};
		defaultCondition.push(new KarabinerConditionKeyboardTypes(["ansi"]));
	}
	const yamaSimKeyMap = new Map();
	yamaSimKeyNames.forEach((line, index, array) => {
		const karaLine = karabinerKeyNames[index];
		line.forEach((keyName, index, array) => {
			const karaKeyName = karaLine[index];
			if (karaKeyName != null) {
				yamaSimKeyMap.set(keyName, karaKeyName);
			}
		});
	});


	defaultCondition.push(new KarabinerConditionApplicationUnless(["^com\\.apple\\.loginwindow$"]));

	const leftThumb1 = thumbKey[0];
	const leftThumb2 = thumbKey[1];
	const rightThumb1 = thumbKey[2];
	const rightThumb2 = thumbKey[3];

	//改行で分割
	const inputLines = inputText.split("\n");
	let yamabukiDefines = [];
	let lastDefine = null;
	let prefixNoSet = new Set();
	inputLines.forEach( function( headLine, index, array ) {
		if ((index == 0) && (title == "")) {
			//1行目のコメントをタイトルとして使用する
			const tmpTitle = headLine.match(/^;(.+)/);
			if ((tmpTitle != null) && (tmpTitle[1] != null)) {
				title = tmpTitle[1];
				if (typeof document !== 'undefined') {
					document.getElementById("title").value = title;
				}
			}
		}

		// [ローマ字シフト無し]、[ローマ字左親指シフト]、[ローマ字右親指シフト]、[ローマ字小指シフト]、[ローマ字小指左親指シフト]、[ローマ字小指右親指シフト]
		// [英数シフト無し]、[英数左親指シフト]、[英数右親指シフト]、[英数小指シフト]、[英数小指左親指シフト]、[英数小指右親指シフト]
		if (headLine.match(/^\[.+\]/)) {
			let inputSource = "us";
			let prefixNo = 0;
			let thumbShift = "none";
			let littleShift = false;
			const simShift = null;

			if (headLine.match(/ローマ字/)) {
				inputSource = "jp";
			}
			if (headLine.match(/左親指/)) {
				thumbShift = "left";
			}
			else if (headLine.match(/右親指/)) {
				thumbShift = "right";
			}
			if (headLine.match(/小指/)) {
				littleShift = true;
			}
			//文字キー前置シフト配列
			const str = headLine.match(/^\[([1-5]?\d).+\]/);
			if ((str != null) && (str[1] != null)) {
				prefixNo = Number(str[1]);
				prefixNoSet.add(prefixNo);
			}
			//４行読み込む
			let keySequenceTable = [];
			keySequenceTable.push(array[index + 1].replace(/\s/g, "").split(","));
			keySequenceTable.push(array[index + 2].replace(/\s/g, "").split(","));
			keySequenceTable.push(array[index + 3].replace(/\s/g, "").split(","));
			keySequenceTable.push(array[index + 4].replace(/\s/g, "").split(","));

			const yamabukiDefine = new YamabukiDefine(headLine, inputSource, prefixNo, thumbShift, littleShift, simShift, keySequenceTable);
			yamabukiDefines.push(yamabukiDefine);
			lastDefine = yamabukiDefine;

		}
		//文字キー同時打鍵シフト配列
		else if (headLine.match(/^<.>/)) {
			if (lastDefine) {
				const simShift = headLine.substring(1,2);
				//４行読み込む
				let keySequenceTable = [];
				keySequenceTable.push(array[index + 1].replace(/\s/g, "").split(","));
				keySequenceTable.push(array[index + 2].replace(/\s/g, "").split(","));
				keySequenceTable.push(array[index + 3].replace(/\s/g, "").split(","));
				keySequenceTable.push(array[index + 4].replace(/\s/g, "").split(","));

				const yamabukiDefine = new YamabukiDefine(lastDefine.description + "_" + headLine, lastDefine.inputSource, lastDefine.prefixNo, lastDefine.thumbShift, lastDefine.littleShift, simShift, keySequenceTable);
				yamabukiDefines.push(yamabukiDefine);
			}
		}
	} );

	//ソート
	yamabukiDefines.sort((a, b) => b.sortKey - a.sortKey);

	const manipulators = [];
	const rules = [new KarabinerRule(title + " for " + keyboardLayout + " keyboard", [])];
	const karabinerDefine = new KarabinerDefine(title, rules);

	yamabukiDefines.forEach( function( yamabukiDefine, index, array ) {
		const conditions = defaultCondition.concat();

		if (yamabukiDefine.inputSource == "jp") {
			conditions.push(new KarabinerConditionInputSources([new KarabinerConditionInputSourceJp()]));
		}
		if (yamabukiDefine.prefixNo > 0) {
			conditions.push(new KarabinerConditionPrefixNo(yamabukiDefine.prefixNo));
		}

		yamabukiDefine.keySequenceTable.forEach( function( keySequenceLine, row, array ) {
			keySequenceLine.forEach( function( keySequence, column, array ) {

				//fromの作成
				let fromKeyName = karabinerKeyNames[row][column];
				if (fromKeyName == null) {
					return;
				}
				let mandatoryKeys = [];
				let optionalKeys = [];
				let simultaneousKeys = [];

				if (yamabukiDefine.thumbShift == "left") {
					if (column <= 4) {
						simultaneousKeys.push(leftThumb1);
					}
					else {
						simultaneousKeys.push(leftThumb2);
					}
					// Todo:修飾キーの場合
				}
				else if (yamabukiDefine.thumbShift == "right") {
					if (column >= 5) {
						simultaneousKeys.push(rightThumb1);
					}
					else {
						simultaneousKeys.push(rightThumb2);
					}
					// Todo:修飾キーの場合
				}
				if (yamabukiDefine.littleShift == true) {
					mandatoryKeys.push("shift");
				}
				if (yamabukiDefine.simShift != null) {
					const simKey = yamaSimKeyMap.get(yamabukiDefine.simShift);
					if (simKey != null) {
						simultaneousKeys.push(simKey);
					}
				}

				let modifiers = undefined;
				if (mandatoryKeys.length + optionalKeys.length > 0) {
					if (mandatoryKeys.length == 0) {
						mandatoryKeys = undefined;
					}
					if (optionalKeys.length == 0) {
						optionalKeys = undefined;
					}
					modifiers = new KarabinerModifiers(mandatoryKeys, optionalKeys);
				}
				let simultaneous = undefined;
				if (simultaneousKeys.length > 0) {
					simultaneous = [new KarabinerKey(fromKeyName)];
					fromKeyName = undefined;
					simultaneousKeys.forEach( function( key, index, array ) {
						simultaneous.push(new KarabinerKey(key));
					} );
				}

				const from = new KarabinerFrom(fromKeyName, modifiers, simultaneous);

				//toの作成

				//文字列から配列へ変換
				//  1文字以上の組み合わせを,で区切る
				//  split()する
				//  各々を1文字単位の配列にする
				//  配列を結合する

				//仮想キーコード直接指定 Vxxxx 非対応
				//文字直接入力'x' "x"
				//設定ファイルの切り替え 設1...10 非対応
				//文字キー前置シフト 1...50
				//機能キー 機1...21
				let tmpStr = keySequence.replace(/((V[0-9a-fA-F]+)|(\".\")|(\'.\')|(設1?\d)|([1-5]?\d)|(機((1?\d)|(2[0-1]))))/g, "$1,");
				//文字直接入力の'"は無視
				tmpStr = keySequence.replace(/[\"\']/g, "");
				const tmpArray = tmpStr.split(",");
				const keySequenceArray = [];
				tmpArray.forEach( function( subString, index, array ) {
					keySequenceArray.push(...subString.split(""));
				} );

				if (keySequenceArray.length == 0) {
					return;
				}
				if (keySequenceArray[0] == "無") {
					return;
				}

				const to = [];
				let toModifiers = [];
				let setPrefixNoCount = 0;
				keySequenceArray.forEach( function( aKey, index, array ) {
					//文字キー前置シフト
					const prefixNoStr = aKey.match(/^[1-5]?\d/);
					if (prefixNoStr != null) {
						let prefixNo = Number(prefixNoStr);
						if (prefixNo != null) {
							if (!prefixNoSet.has(prefixNo)) {
								// 未定義の番号の場合
								prefixNo = 0;
							}
							to.push(new KarabinerSetPrefixNo(prefixNo));
							setPrefixNoCount++;
						}
						return;
					}
					//修飾キー
					const toModifier = yama2KaraModifiers.get(aKey);
					if (toModifier != null) {
						toModifiers.push(toModifier);
						return;
					}
					//通常のキーシーケンス
					const toKeys = yama2Kara.get(aKey);
					if (toKeys != null) {
						toKeys.forEach( function( toKey, index, array ) {
							if (toModifiers.length > 0) {
								if (toKey.modifiers == null) {
									toKey.modifiers = [];
								}
								toKey.modifiers.push(toModifiers);
							}
						} )
						to.push(...toKeys);
					}
				} );

				//現在の文字キー前置シフト面が0番以外で、
				//文字キー前置シフトが指定されていない場合は、0番に戻す
				if ((yamabukiDefine.prefixNo > 0) && (setPrefixNoCount == 0)) {
					to.push(new KarabinerSetPrefixNo(0));
				}

				if (to.length == 0) {
					//yama2Karaに未定義の記号などの場合
					return;
				}

				const manipulator = new KarabinerManipulator(from, to, conditions);
				karabinerDefine.rules[0].manipulators.push(manipulator);
			} );
		} );
	} );

	var json = JSON.stringify( karabinerDefine, null, '  ' );

	return json;
}

// CLI / argparse functionality
function parseArgs(args) {
	const options = {
		input: null,
		output: null,
		title: "",
		keyboardLayout: "JP",
		leftThumb1: "spacebar",
		leftThumb2: "spacebar",
		rightThumb1: "insert",
		rightThumb2: "insert",
		encoding: null,
		help: false,
	};

	let i = 0;
	while (i < args.length) {
		const arg = args[i];
		if (arg === "-h" || arg === "--help") {
			options.help = true;
			i++;
		} else if (arg === "-i" || arg === "--input") {
			options.input = args[++i];
			i++;
		} else if (arg === "-o" || arg === "--output") {
			options.output = args[++i];
			i++;
		} else if (arg === "-t" || arg === "--title") {
			options.title = args[++i];
			i++;
		} else if (arg === "-k" || arg === "--layout") {
			options.keyboardLayout = args[++i].toUpperCase();
			i++;
		} else if (arg === "-e" || arg === "--encoding") {
			options.encoding = args[++i];
			i++;
		} else if (arg === "-L" || arg === "--left-thumb") {
			const val = args[++i];
			options.leftThumb1 = val;
			options.leftThumb2 = val;
			i++;
		} else if (arg === "-R" || arg === "--right-thumb") {
			const val = args[++i];
			options.rightThumb1 = val;
			options.rightThumb2 = val;
			i++;
		} else if (arg === "-l" || arg === "--left-thumb-1") {
			options.leftThumb1 = args[++i];
			i++;
		} else if (arg === "-a" || arg === "--left-thumb-2") {
			options.leftThumb2 = args[++i];
			i++;
		} else if (arg === "-r" || arg === "--right-thumb-1") {
			options.rightThumb1 = args[++i];
			i++;
		} else if (arg === "-b" || arg === "--right-thumb-2") {
			options.rightThumb2 = args[++i];
			i++;
		} else if (!arg.startsWith("-") && options.input === null) {
			options.input = arg;
			i++;
		} else {
			i++;
		}
	}
	return options;
}

function decodeYabBuffer(buffer, specifiedEncoding) {
	if (!buffer || buffer.length === 0) return "";

	if (specifiedEncoding) {
		return new TextDecoder(specifiedEncoding).decode(buffer);
	}

	// 1. BOM (Byte Order Mark) 判定
	if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
		return new TextDecoder('utf-8').decode(buffer.subarray(3));
	}
	if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
		return new TextDecoder('utf-16le').decode(buffer.subarray(2));
	}
	if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
		return new TextDecoder('utf-16be').decode(buffer.subarray(2));
	}

	// 2. BOMなし UTF-16LE / UTF-16BE のヒューリスティック判定
	// yabファイルはASCII文字 (セミコロン、角括弧、改行、カンマなど) を多く含むため、
	// UTF-16LEでは奇数インデックスに 0x00、UTF-16BEでは偶数インデックスに 0x00 が出現する
	if (buffer.length >= 4) {
		let nullOdd = 0;
		let nullEven = 0;
		const sampleLen = Math.min(buffer.length, 512);
		for (let idx = 0; idx < sampleLen; idx++) {
			if (buffer[idx] === 0x00) {
				if (idx % 2 === 1) nullOdd++;
				else nullEven++;
			}
		}
		if (nullOdd > sampleLen / 4 && nullEven === 0) {
			try {
				return new TextDecoder('utf-16le', { fatal: true }).decode(buffer);
			} catch (e) {}
		}
		if (nullEven > sampleLen / 4 && nullOdd === 0) {
			try {
				return new TextDecoder('utf-16be', { fatal: true }).decode(buffer);
			} catch (e) {}
		}
	}

	// 3. 厳格な UTF-8 デコード
	try {
		const decoder = new TextDecoder('utf-8', { fatal: true });
		return decoder.decode(buffer);
	} catch (e) {}

	// 4. Shift_JIS / CP932 デコード
	try {
		const decoder = new TextDecoder('shift_jis', { fatal: true });
		return decoder.decode(buffer);
	} catch (e) {}

	// 5. EUC-JP デコード
	try {
		const decoder = new TextDecoder('euc-jp', { fatal: true });
		return decoder.decode(buffer);
	} catch (e) {}

	// 6. フォールバック
	try {
		return new TextDecoder('shift_jis').decode(buffer);
	} catch (e) {
		return new TextDecoder('utf-8').decode(buffer);
	}
}

function printHelp() {
	console.log(`yab2karabiner - やまぶきR(*.yab) -> Karabiner-Elements JSON 変換ツール

使用方法:
  yab2karabiner [オプション] <input.yab>
  node yab2karabiner.js [オプション] <input.yab>

オプション:
  -i, --input <file>                   入力となるやまぶきR設定ファイル (*.yab)
  -o, --output <file>                  出力先のJSONファイルパス (省略時は標準出力)
  -t, --title <title>                  ルールのタイトル (省略時はyabファイル1行目のコメント)
  -k, --layout <JP|US>                 キーボード配列 (デフォルト: JP)
  -e, --encoding <enc>                 文字コード明示指定 (省略時はUTF-8/UTF-16/Shift-JIS等を自動判定)
  -L, --left-thumb <key>               左親指シフトキー (両方一括設定)
  -R, --right-thumb <key>              右親指シフトキー (両方一括設定)
  -l, --left-thumb-1 <key>             左同手親指シフトキー (デフォルト: spacebar)
  -a, --left-thumb-2 <key>             左異手親指シフトキー (デフォルト: spacebar)
  -r, --right-thumb-1 <key>            右同手親指シフトキー (デフォルト: insert)
  -b, --right-thumb-2 <key>            右異手親指シフトキー (デフォルト: insert)
  -h, --help                           このヘルプメッセージを表示

例:
  node yab2karabiner.js sample.yab -o myMapping.json
  node yab2karabiner.js sample.yab -k US -L spacebar -R right_command
  node yab2karabiner.js sample.yab -l spacebar -a japanese_eisuu -r right_command -b japanese_kana
`);
}

function main() {
	const options = parseArgs(process.argv.slice(2));

	if (options.help) {
		printHelp();
		process.exit(0);
	}

	let inputText = "";
	if (options.input) {
		const filePath = path.resolve(process.cwd(), options.input);
		if (!fs.existsSync(filePath)) {
			console.error(`エラー: ファイルが見つかりません: ${options.input}`);
			process.exit(1);
		}
		const buffer = fs.readFileSync(filePath);
		inputText = decodeYabBuffer(buffer, options.encoding);
	} else if (!process.stdin.isTTY) {
		// 標準入力からバイナリとして読み込み、自動判別
		const buffer = fs.readFileSync(0);
		inputText = decodeYabBuffer(buffer, options.encoding);
	} else {
		printHelp();
		process.exit(1);
	}

	const thumbKey = [
		options.leftThumb1,
		options.leftThumb2,
		options.rightThumb1,
		options.rightThumb2
	];

	const json = processYab2Json(options.title, inputText, options.keyboardLayout, thumbKey);

	if (options.output) {
		const outPath = path.resolve(process.cwd(), options.output);
		fs.writeFileSync(outPath, json, 'utf-8');
	} else {
		console.log(json);
	}
}

if (require.main === module) {
	main();
}

module.exports = {
	processYab2Json,
	KarabinerModifiers,
	KarabinerKey,
	KarabinerFrom,
	KarabinerTo,
	KarabinerSetVar,
	KarabinerSetPrefixNo,
	KarabinerConditionInputSource,
	KarabinerConditionInputSourceJp,
	KarabinerConditionInputSources,
	KarabinerConditionApplicationUnless,
	KarabinerConditionKeyboardTypes,
	KarabinerConditionPrefixNo,
	KarabinerManipulator,
	KarabinerRule,
	KarabinerDefine,
	YamabukiDefine
};

