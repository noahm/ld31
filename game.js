function Display($canvas) {
	/**
	 * Gradually transition the background and text colors
	 */
	this.setColorScheme = function(bg, fg) {
		// TODO
	}

	/**
	 * @param	lines	array of strings
	 */
	this.addLines = function(lines) {
		lines.forEach(function(line) {
			$('<p></p>').text(line).appendTo($canvas);
		}, this);
	};

	/**
	 * @param	commands	array of string names of commands
	 */
	this.addCommands = function(commands) {
		commands.forEach(function(cmdName) {
			var cmd = commandRegistry[cmdName];
			if (typeof cmd === 'undefined' || cmd.added) {
				return; // avoid adding nonexistant or duplicate commands
			}

			$('<span></span>')
				.text(cmd.text)
				.addClass('cmd')
				.appendTo('#commands')
				.click(cmd.onclick);
			cmd.added = true;
		}, this);
	}
}

var commandRegistry = {};
function Command(text, onclick) {
	this.text = text;
	this.onclick = onclick;
	this.added = false;

	// register this in the catalog of all commands
	commandRegistry[text] = this;
}

window.display = new Display(jQuery('#canvas'));

// define command behaviors
new Command('open eyes', function() {
	display.addLines([
		'Ugh. You had been having such a plesant nap, but the thought of the upcoming deadline coaxes you awake, slightly groggy.',
		'You are sitting in a comfortable chair in a dark room. You can feel the gentle contours of a computer mouse under your right hand.'
	]);
	display.addCommands(['move hand']);
});
new Command('move hand', function() {
	display.addLines([
		'Almost immediately you are blinded by a large computer screen less than a meter from your face.',
		'It eagerly burns your retinas with the image of your half completed game.',
	]);
	// add brief flash of light?
	display.addCommands([
		'look at game',
		'look at clock',
	]);
});
new Command('look at game');
new Command('look at clock');

// create starting game state
display.addLines([
	'You are asleep.',
]);
display.addCommands(['open eyes']);
