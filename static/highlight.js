"use strict";

class Token {
	constructor(type, literal) {
		this.type = type;
		this.literal = literal;
	}

	toHtmlElement() {
		if (this.type === Type.Other) return this.literal;

		const color = this.type === Type.Ident ? 'rgb(174, 214, 241)' :
					  this.type === Type.Num ? 'rgb(187, 143, 206)' :
					  this.type === Type.Str ? 'rgb(0, 255, 0)' :
					  this.type === Type.Sym ? 'rgb(255, 128, 128)' :
					  this.type === Type.Reserved ? 'rgb(255, 123, 114)' :
					  this.type === Type.Type ? 'rgb(144, 238, 144)' :
					  this.type === Type.BuiltinFun ? 'rgb(33, 97, 140)' :
					  this.type === Type.Error ? 'rgb(144, 238, 144)' :
					  this.type === Type.Fun ? 'rgba(218,219,153,255)' :
					  this.type === Type.Comment ? 'rgb(160, 160, 160)' : 
					  this.type === Type.Other ? 'rgb(255, 255, 255)' : 'white';

		return `<span class="inline-code" style="color: ${color};">${this.literal}</span>`;
	}

	// Debug purposes
	toString() {
		return `(${this.type.name}, '${this.literal}')`;
	}
}

class Type {
	static Ident = new Type('Ident');
	static Num = new Type('Num');
	static Str = new Type('Str');
	static Sym = new Type('Sym');
	static Reserved = new Type('Reserved');
	static BuiltinFun = new Type('BuiltinFun');
	static Comment = new Type('Comment');
	static Type = new Type('Type');
	static Error = new Type('Error');
	static Fun = new Type('Fun');
	static Other = new Type('Other');

	constructor(name) {
		this.name = name;
	}
}

class Highlighter {
	static ValidIdentChars = [
		'a', 'b', 'c', 'd', 'e', 'f', 
		'g', 'h', 'i', 'j', 'k', 'l', 
		'm', 'n', 'o', 'p', 'q', 'r', 
		's', 't', 'u', 'v', 'w', 'x', 
		'y', 'z', 'A', 'B', 'C', 'D', 
		'E', 'F', 'G', 'H', 'I', 'J', 
		'K', 'L', 'M', 'N', 'O', 'P', 
		'Q', 'R', 'S', 'T', 'U', 'V', 
		'W', 'X', 'Y', 'Z', '_', '0',
		'1', '2', '3', '4', '5', '6',
		'7', '8', '9',
	];
	
	static ValidIdentCharsNoDigits = [
		'a', 'b', 'c', 'd', 'e', 'f', 
		'g', 'h', 'i', 'j', 'k', 'l', 
		'm', 'n', 'o', 'p', 'q', 'r', 
		's', 't', 'u', 'v', 'w', 'x', 
		'y', 'z', 'A', 'B', 'C', 'D', 
		'E', 'F', 'G', 'H', 'I', 'J', 
		'K', 'L', 'M', 'N', 'O', 'P', 
		'Q', 'R', 'S', 'T', 'U', 'V', 
		'W', 'X', 'Y', 'Z', '_',
	];

	static ReservedIdentifiers = [
	    'and', 
	    'or', 
	    'not', 
	    'if', 
	    'else', 
	    'do', 
	    'end', 
	    'for',
	    'foreach',
	    'while', 
	    'fun', 
	    'continue', 
	    'break',
	    'return', 
	    'match',
	    'try',
	    'catch',
	    'in',
	    'throw',
	    'using',
		'as',
	    'true',
	    'false',
	    'nothing',
	];

	static BuiltinFunctions = [
		'print',
		'println',
		'read_line',

		'to_int',
		'to_float',
		'to_str',

		'vpush_back',
		'vpush_front',
		'vpush_at',
		'vpop_front',
		'vpop_back',
		'vpop_at',
		'vfrom_range',
		'vcopy',

		'str_starts_with',
		'str_ends_with',
		'str_is_lowercase',
		'str_is_uppercase',
		'str_to_lowercase',
		'str_to_uppercase',

		'len',
		'get',
		'join',
		'slice',
		'split',
		'replace',

		'fread',
		'fwrite',
		'fappend',

		'err_short',
		'err_traceback',
		'err_kind',
		'err_line',

		'assert',
		'typeof',
		'format',
	];

	// All the value types that a variable can have in betty
	static Types = [
		"Int",
		"Float",
		"String",
		"Bool",
		"Nothing",
		"Vector",
		"Function",
		"BuiltinFunction",
		"AnonymousFunction",
		"Error",
		"Type",
	];

	// betty builtin errors
	static Errors = [
		"ValueError",
		"TypeError",
		"UnknownIdentifierError",
		"OverflowError",
		"DivisionByZeroError",
		"IndexOutOfBoundsError",
		"FileIOError",
		"VectorMutationError",
		"ModuleImportError",
		"AssertionError",
		"WrongArgumentsNumberError",
	];

	static ValidDigitChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '_'];

	static Digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
	
	static ValidSymbolChars = [
	    '+', '-', '*', '/', '^', '%', 
	    ':', /*'(', ')', '[', ']', */'=', 
	    '>', '<', '!', /*'.', ',', */'?',
	];  // For now I want them in white

	constructor(source, elementId) {
		this.source = source;
		this.advance();
		this.elementId = elementId;
	}

	advance() {
		this.currentChar = this.source.shift();
		if (this.currentChar === undefined) this.currentChar = null;
	}

	nextIs(char) {
		// Check whether the current char is the char
		// or the char after whitespaces is the char
		if (this.currentChar == char) return true;
		
		const firstChar = [...this.source]
			.filter(ch => !['\n', ' ', '\t'].includes(ch))[0];
		return firstChar == char;
	}

	makeIdent() {
		let ident = '';
        
		while (Highlighter.ValidIdentChars.includes(this.currentChar)) {
			ident += this.currentChar;
			this.advance();
		}

		const type = Highlighter.ReservedIdentifiers.includes(ident) ? Type.Reserved : 
					 Highlighter.BuiltinFunctions.includes(ident) ? Type.BuiltinFun : 
					 Highlighter.Errors.includes(ident) ? Type.Error :
					 Highlighter.Types.includes(ident) ? Type.Type :
					 this.nextIs('(') ? Type.Fun : Type.Ident;

		return new Token(type, ident);
	}

	makeNum() {
		let num = '';
		let hasDot = false;

		while (Highlighter.ValidDigitChars.includes(this.currentChar)) {
			if (this.currentChar === '.') {
				if (hasDot) return new Token(Type.Num, num);
				hasDot = true;
			}
			num += this.currentChar;
			this.advance();
		}
		return new Token(Type.Num, num);
	}

	makeString() {
		let string = '"';
		this.advance();  // skip '"', otherwise we would not enter the loop

		while (this.currentChar !== null && this.currentChar !== '"') {
			string += this.currentChar;
			this.advance();
		}
		if (this.currentChar === '"') {
			string += '"';
			this.advance();
		}
		return new Token(Type.Str, string);
	}

	makeSymOrOther() {
	    const type = Highlighter.ValidSymbolChars.includes(this.currentChar) ? Type.Sym : Type.Other;
	    const token = new Token(type, this.currentChar);
	    this.advance();
	    
		return token;
	}

	makeComment() {
		let comment = this.currentChar;  // Start with '|'
		this.advance();

		while (this.currentChar !== null && this.currentChar != '\n') {
			comment += this.currentChar;
			this.advance();
		}
		// Do not add the newline to the comment
		return new Token(Type.Comment, comment);
	}

	makeForcedOther() {
		let text = '';
		this.advance();  // skip '$'

		// We don't check for null bcs we know it will never be null
		// as I hardcoded it
		while (this.currentChar !== '$') {
			text += this.currentChar;
			this.advance();
		}

		this.advance();  // skip '$'
		return new Token(Type.Other, text);
	}

	makeTokens() {
		let tokens = []
		while (this.currentChar !== null) {
		    let token = 
		    	Highlighter.ValidIdentCharsNoDigits.includes(this.currentChar) ? this.makeIdent() : 
		    	Highlighter.ValidDigitChars.includes(this.currentChar) ? this.makeNum() : 
		    	this.currentChar === '"' ? this.makeString() :
				this.currentChar === '|' ? this.makeComment() :
				this.currentChar === '$' ? this.makeForcedOther() :
		    	this.makeSymOrOther();

		    tokens.push(token);
		}
		return tokens;
	}

	makeElements() {
		const tokens = this.makeTokens();
		const elements = tokens.map(token => token.toHtmlElement()).join('');
		return elements;
	}

	insertHighlightedElements() {
		const elements = this.makeElements();
		const contents = `<pre><code>${elements}</code></pre>`;
		document.getElementById(this.elementId).innerHTML = contents;
	}
}

function highlightCode(source, id) {
	source = Array.from(source);
	const highlighter = new Highlighter(source, id);
	highlighter.insertHighlightedElements();
}