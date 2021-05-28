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


async function obtainAndPopulate(request, cardHolder) {
	// empty container before repopulation
	cardHolder.innerHTML = "";

	let response = await fetch(request)
	if (!response.ok) { throw new Error(response) }
	let json = await response.json()

	// build the card for each mathematician
	let ids = [];
	json.results.bindings.forEach(e => {
		ids.push(extractEntityId(e.mathematician.value))
	});
	let urls = await getWikipediaUrls(ids)

	for (let i = 0; i < json.results.bindings.length; i++) {
		let card = constructCard(json.results.bindings[i])

		let sanitizedName = extractName(json.results.bindings[i])
		let header = card.querySelector(".card-header")
		if (urls[i] != undefined) {
			header.innerHTML = "<a href=" + urls[i] + ">" + sanitizedName + "</a>";
		} else {
			header.innerHTML = `<span>${sanitizedName}</span>`
		}

		cardHolder.appendChild(card);
	}
}

// returns a card html node
function constructCard(result) {
	let col = document.createElement("div");
	col.className = "col";

	let card = document.createElement("div");
	card.className = "card";

	let name = document.createElement("h5");
	name.className = "card-header text-center";
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
	return col
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

function extractEntityId(url) {
	let u = url.split("/")
	return u[u.length - 1]
}

async function getWikipediaUrls(ids) {
	let link = `https://www.wikidata.org/w/api.php?origin=*&format=json&action=wbgetentities&ids=${ids.join('|')}&props=sitelinks/urls&sitefilter=enwiki`;
	let response = await fetch(link, { method: "GET", })
	if (!response.ok) { throw new Error(response) }
	let json = await response.json()

	let urls = [];
	for (let i = 0; i < ids.length; i++) {
		urls.push(json.entities[ids[i]]?.sitelinks?.enwiki?.url)
	}
	return urls
}
