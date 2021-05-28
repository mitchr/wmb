'use strict';

// https://w.wiki/3Q9c
document.addEventListener("DOMContentLoaded", event => {
	datePicker = document.getElementById("datePicker");

	// set datepicker default to today
	datePicker.valueAsDate = new Date();

	datePicker.onchange = function () {
		let date = this.valueAsDate;

		const query = `SELECT ?mathematician ?mathematicianLabel (SAMPLE(?givenLabel) AS ?given) (SAMPLE(?familyLabel) AS ?family) ?dob (SAMPLE(?i) AS ?img) (GROUP_CONCAT(?fieldLabel; SEPARATOR = ",") AS ?fields) WHERE {
			?mathematician wdt:P106 wd:Q170790;
				wdt:P21 wd:Q6581072;
				wdt:P569 ?dob.
			OPTIONAL { ?mathematician wdt:P101 ?field. }
			OPTIONAL { ?mathematician wdt:P18 ?i. }
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

		let encoded = encodeURI(query).replace(/%7B/gi, "{").replace(/%7D/gi, "}").replace(/&/gi, "%26");

		let requestSPARQL = new Request(`https://query.wikidata.org/sparql?format=json&query=${encoded}`, { method: "GET", });

		let cardHolder = document.getElementById("cardHolder");
		obtainAndPopulate(requestSPARQL, cardHolder);
	}

	// force an onchange so we obtain data for today by default
	datePicker.onchange();
})


async function obtainAndPopulate(request, cardHolder) {
	// empty container before repopulation
	cardHolder.innerHTML = "";

	let json = await fetch(request).then(r => r.json());

	// build the card for each mathematician
	let ids = json.results.bindings.map(e => extractEntityId(e.mathematician.value));
	let urls = await getWikipediaUrls(ids);

	json.results.bindings.forEach((e, i) => {
		let card = constructCard(e);

		let sanitizedName = extractName(e);
		let header = card.querySelector(".card-header");
		if (urls[i] != undefined) {
			header.innerHTML = `<a href=${urls[i]}>${sanitizedName}</a>`;
		} else {
			header.innerHTML = `<span>${sanitizedName}</span>`;
		}
		header.innerHTML += ` <sup><a href="https://www.wikidata.org/wiki/${ids[i]}"><span class="badge bg-info">wikidata</span></a></sup>`

		cardHolder.appendChild(card);
	})
}

// returns a col html node that contains a card
function constructCard(result) {
	let col = document.createElement("div");
	col.className = "col";

	let card = document.createElement("div");
	card.className = "card";

	// create header here. it doesn't get set until we verify that this 
	// person has a valid wikipedia page, but it needs to be added to the 
	// card's childNodes before anything else or it gets misplaced
	let header = document.createElement("h5");
	header.className = "card-header text-center";
	card.appendChild(header);

	let body = document.createElement("div")
	body.className = "card-body"

	if (result.img != undefined) {
		let img = document.createElement("img");
		img.className = "card-img-top img-fluid rounded";
		img.src = result.img.value;
		body.appendChild(img);
	}

	let text = document.createElement("div");
	text.className = "card-text text-capitalize text-center";
	text.innerHTML = result?.fields?.value.split(",").join(", ");
	body.appendChild(text);
	card.appendChild(body);

	let date = new Date(result.dob.value);
	let birthday = document.createElement("div");
	birthday.className = "card-footer text-center";
	birthday.innerHTML = date.getMonth() + 1 + '-' + date.getUTCDate() + '-' + date.getFullYear();
	card.appendChild(birthday);

	col.appendChild(card);
	return col;
}

function extractName(person) {
	let given = person?.given?.value;
	let family = person?.family?.value;
	if (given === undefined || family === undefined) {
		return person.mathematicianLabel.value;
	} else {
		return given + " " + family;
	}
}

function extractEntityId(url) { return url.split("/").pop() }

async function getWikipediaUrls(ids) {
	let link = `https://www.wikidata.org/w/api.php?origin=*&format=json&action=wbgetentities&ids=${ids.join('|')}&props=sitelinks/urls&sitefilter=enwiki`;

	return fetch(link, { method: "GET", })
		.then(resp => resp.json())
		.then(json => {
			// wrap urls in new Promise so we can await
			return new Promise(resolve => {
				let urls = ids.map(e => json.entities[e]?.sitelinks?.enwiki?.url)
				resolve(urls)
			})
		})
		.catch(e => console.error(e))
}
