// https://w.wiki/Yn7
document.addEventListener("DOMContentLoaded", event => {
	datePicker = document.getElementById("datePicker");

	// set datepicker default to today
	datePicker.valueAsDate = new Date();

	datePicker.onchange = function() {
		dateValue = new Date(Date.parse(this.value));
		dateStr = dateValue.getFullYear() + '-' + (dateValue.getUTCMonth()+1) + '-' + dateValue.getUTCDate()

		let query = `SELECT ?mathematician ?mathematicianLabel ?dob ?sex ?image WHERE {?mathematician wdt:P106 wd:Q170790; wdt:P569 ?dob; OPTIONAL {?mathematician wdt:P21 ?sex.} OPTIONAL {?mathematician wdt:P18 ?image.} FILTER(MONTH("${dateStr}"^^xsd:dateTime) = MONTH(?dob) && DAY("${dateStr}"^^xsd:dateTime) = DAY(?dob) && ?sex = wd:Q6581072). SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". } } ORDER BY ASC(?dob)`;

		let encoded = encodeURI(query).replace(/%7B/gi, "{").replace(/%7D/gi, "}").replace(/&/gi, "%26")

		let requestSPARQL = new Request("https://query.wikidata.org/sparql", {
			method: "POST",
			body: "query="+encoded,
			headers: {
				"accept": "application/sparql-results+json",
				"content-type": "application/x-www-form-urlencoded"
			}
		});

		let container = document.getElementById("container");
		obtainAndPopulate(requestSPARQL, container)
	}

	// force an onchange so we obtain data for today by default
	datePicker.onchange()
})


function obtainAndPopulate(request, container) {
	// empty container before repopulation
	container.innerHTML = "";

	fetch(request).then(response => {
		if (!response.ok) {
			throw new Error(response)
		}
		response.json().then(json => {
			// console.log(json)

			// build the div for each mathematician
			for (let i = 0; i < json.results.bindings.length; i++) {
				result = json.results.bindings[i]

				let div = document.createElement("div");
				div.className = "mathematician";

				if (result.image != undefined) {
					let imgHolder = document.createElement("div");
					let img = document.createElement("img");
					img.className = "img"
					img.src = result.image.value;
					imgHolder.appendChild(img);
					div.appendChild(imgHolder);
				}

				let name = document.createElement("div");
				name.className = "descriptiveText";
				let link = "https://wikipedia.org/wiki/" + result.mathematicianLabel.value.replace(/ /gi, "_")

				name.innerHTML = "<a href="+link+">"+result.mathematicianLabel.value+"</a>";
				div.appendChild(name);

				let date = new Date(Date.parse(result.dob.value))
				fmtDate = date.getMonth()+1 + '-' + date.getUTCDate() + '-' + date.getFullYear()

				let birthday = document.createElement("div");
				birthday.className = "descriptiveText";
				birthday.innerHTML = fmtDate;
				div.appendChild(birthday);

				container.appendChild(div)
			}
		})
	})
}

// performs a HEAD request on a link and determines if it is broken (returns 404)
function isBroken(link) {
	fetch(link, {
		method: "HEAD",
		redirect: "follow",
		// mode: "no-cors"
	})
		.then(response => console.log(response.status))
		.catch(error => {console.error('error:', error)})
}
