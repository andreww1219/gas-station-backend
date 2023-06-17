const inputs = [1, 2, 3]
const outputs = [3, 1, 2]
function moni(inputs, outputs) {
	for (let i = 0; i < outputs.length; i++) {
		if (inputs.length !== 0) {
			let top = inputs.pop()
			if (top == outputs[i]) {
				continue
			} else {
				return "No"
			}
		}
	}
	return "Yes"
}
