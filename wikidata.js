'use strict';

// https://w.wiki/3Psx
document.addEventListener("DOMContentLoaded", event => {
	datePicker = document.getElementById("datePicker");

	// set datepicker default to today
	datePicker.valueAsDate = new Date();

	datePicker.onchange = function () {
		let date = new Date(Date.parse(this.value));

		const query = `SELECT ?mathematician ?mathematicianLabel (SAMPLE(?givenLabel) as ?given) (SAMPLE(?familyLabel) as ?family) ?dob ?img (GROUP_CONCAT(?fieldLabel; SEPARATOR = ",") AS ?fields) WHERE {
			?mathematician wdt:P106 wd:Q170790;
				wdt:P21 wd:Q6581072;
				wdt:P569 ?dob.
			OPTIONAL { ?mathematician wdt:P101 ?field. }
			OPTIONAL { ?mathematician wdt:P18 ?img. }
			OPTIONAL { ?mathematician wdt:P735 ?given. }
			OPTIONAL { ?mathematician wdt:P734 ?family. }
			FILTER((${date.getMonth() + 1}  = (MONTH(?dob))) && (${date.getDate() + 1}  = (DAY(?dob))))
			SERVICE wikibase:label {
				bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en".
				?mathematician rdfs:label ?mathematicianLabel.
				?given rdfs:label ?givenLabel.
				?family rdfs:label ?familyLabel.
				?field rdfs:label ?fieldLabel.
			}
		}
		GROUP BY ?mathematician ?mathematicianLabel ?dob ?img
		ORDER BY (?dob)`

		let encoded = encodeURI(query).replace(/%7B/gi, "{").replace(/%7D/gi, "}").replace(/&/gi, "%26")

		let requestSPARQL = new Request("https://query.wikidata.org/sparql", {
			method: "POST",
			body: "query=" + encoded,
			headers: {
				"accept": "application/sparql-results+json",
				"content-type": "application/x-www-form-urlencoded"
			}
		});

		let cardHolder = document.getElementById("cardHolder");
		obtainAndPopulate(requestSPARQL, cardHolder)
	}

	// force an onchange so we obtain data for today by default
	datePicker.onchange()
})


function obtainAndPopulate(request, cardHolder) {
	// empty container before repopulation
	cardHolder.innerHTML = "";

	fetch(request).then(response => {
		if (!response.ok) {
			throw new Error(response)
		}
		response.json().then(json => {
			// build the card for each mathematician
			for (let i = 0; i < json.results.bindings.length; i++) {
				let result = json.results.bindings[i];

				let col = document.createElement("div");
				col.className = "col";

				let card = document.createElement("div");
				card.className = "card";

				let sanitizedName = extractName(result)
				let name = document.createElement("h5");
				name.className = "card-header text-center";
				let link = "https://wikipedia.org/wiki/" + sanitizedName.replace(/ /gi, "_");
				name.innerHTML = "<a href=" + link + ">" + sanitizedName + "</a>";
				card.appendChild(name);

				let body = document.createElement("div")
				body.className = "card-body"

				if (result.img != undefined) {
					let img = document.createElement("img");
					img.className = "card-img-top img-fluid rounded";
					img.src = result.img.value;

					body.appendChild(img);
					card.appendChild(body);
				}

				let text = document.createElement("div")
				text.className = "card-text text-capitalize text-center"
				text.innerHTML = result.fields.value.split(",").join(", ")
				body.appendChild(text)

				let date = new Date(Date.parse(result.dob.value));
				let fmtDate = date.getMonth() + 1 + '-' + date.getUTCDate() + '-' + date.getFullYear();

				let birthday = document.createElement("div");
				birthday.className = "card-footer text-center";
				birthday.innerHTML = fmtDate;
				card.appendChild(birthday);

				col.appendChild(card)
				cardHolder.appendChild(col);
			}
		})
	})
}

function extractName(person) {
	let given = person?.given?.value
	let family = person?.family?.value
	if (given === undefined || family === undefined) {
		return person.mathematicianLabel.value
	} else {
		return given + " " + family
	}
}

function isBroken(url) {
	let l = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join('|')}&props=sitelinks/urls&sitefilter=enwiki`;
	fetch(link, {
		method: "GET",
		redirect: "follow",
		// mode: "no-cors"
	})
		.then(response => console.log(response.body))
		.catch(error => { console.error('error:', error) })
}
