// Code here

// Variables for pages
let currentPage = 1;
let resultsPerPage = 96;
let allResults = [];

// Load click event listener
window.onload = (e) => 
{
    document.querySelector("#search").onclick = searchButtonClicked;

    // Move back a page
    document.querySelector("#prevButton").onclick = () => 
    {
        if (currentPage > 1) 
        {
            currentPage--;
            displayPage(currentPage);
        }
    }

    // Move forward a page
    document.querySelector("#nextButton").onclick = () =>
    {
        if (currentPage < Math.ceil(allResults.length / resultsPerPage))
        {
            currentPage++;
            displayPage(currentPage);
        }
    }

    // Create eventListener
    document.getElementById("search").addEventListener("click", () => 
    {
        // Get values to store
        const generation = document.getElementById("gen").value;
        const type1 = document.getElementById("type1").value;
        const type2 = document.getElementById("type2").value;
        const searchterm = document.getElementById("searchterm").value;

        // Save search filters to localStorage
        const lastSearch = { generation, type1, type2, searchterm };
        localStorage.setItem("lastSearch", JSON.stringify(lastSearch));
    });
}

// DOMContent Loaded listener to restore previous values 
window.addEventListener("DOMContentLoaded", () => 
{
    const saved = localStorage.getItem("lastSearch");
    if (saved) 
    {
        const { generation, type1, type2, searchterm} = JSON.parse(saved);

        // Set dropdowns to previous values
        document.getElementById("gen").value = generation || "";
        document.getElementById("type1").value = type1 || "";
        document.getElementById("type2").value = type2 || "";
        document.getElementById("searchterm").value = searchterm || "";

        // Optionally auto-fetch last search
        searchButtonClicked();
    }
});

// Get display term
let displayTerm = "";

// Create function for search button
function searchButtonClicked()
{
    // Make sure functions runs
    console.log("searchButtonClicked() called");

    // API URL
    const API_URL = "https://pokeapi.co/api/v2/";

    // Search term
    let term = document.querySelector("#searchterm").value.trim().toLowerCase();
    displayTerm = term;

    // Get other search drop downs
    let type1 = document.querySelector("#type1").value.toLowerCase();
    let type2 = document.querySelector("#type2").value.toLowerCase();
    let gen = document.querySelector("#gen").value;

    // Update status
    document.querySelector("#content").innerHTML = "";
    document.querySelector("h2").innerHTML = `Searching for Pokemon...`;

    // If user enters a name make sure to search directly
    if (term.length > 0)
    {
        // Create URL
        let url = API_URL + "pokemon/" + term;

        // Update search status
        console.log("Fetching specific Pokemon: ", url);

        // get data for display results
        getData(url, "name", {type1, type2, gen});

        // break out
        return;
    }

    // If a generation is chosen use this instead
    if (gen !== "None")
    {
        // Create URL
        let url = API_URL + "generation/" + gen;

        // Update status
        console.log("Fetching Generation: ", url);

        // Get data for display results
        getData(url, "generation", {type1, type2 });

        // break out
        return;
    }

    // Check dropboxes, return data when one type is selected
    if (gen === "None" && type1 !== "none" && type2 === "none") 
    {
        let url = API_URL + "type/" + type1;
        console.log("Fetching by Type: ", url);
        getData(url, "type", { type1, type2 });
        return;
    }

    // Check dropboxes, return data when two types are selected
    if (gen === "None" && type1 !== "none" && type2 !== "none") 
    {
        let url = API_URL + "type/" + type1;
        console.log("Fetching by Type: ", url);
        getData(url, "type", { type1, type2 });
        return;
    }


    // When nothing is selected get data from national pokedex
    let url = API_URL + "pokedex/national";
    console.log("Fetching Pokémon from National Pokédex: ", url);
    getData(url, "pokedex", { type1, type2 });

}

// Get data function using xhr
function getData(url, mode, filters)
{
    // Get xhr request
    let xhr = new XMLHttpRequest();

    // Load data 
    xhr.onload = (e) => dataLoaded(e, mode, filters);

    // Check for error
    xhr.onerror = dataError;

    // Prepare and request http
    xhr.open("GET", url);
    xhr.send();
}

// Function to handle successful API response
async function dataLoaded(e, mode, filters)
{
    // get xhr for target
    let xhr = e.target;

    // Convert xhr response to JSON
    let obj = JSON.parse(xhr.responseText);
    console.log("API data loaded: ", obj);

    // create result variable
    let results = [];

    // Load data for each search section
    if (mode == "name")
    {
        results = [obj];
    }
    else if (mode == "generation")
    {
        results = obj.pokemon_species.map(p => p.name.toLowerCase());
    }
    else if (mode == "pokedex")
    {
        results = obj.pokemon_entries.map(p => p.pokemon_species.name);
    }
    else if (mode == "type") 
    {
        results = obj.pokemon.map(p => p.pokemon.name);
    }
    else if (mode == "dualtype") 
    {
        results = obj.pokemon.map(p => p.pokemon.name);
    }
    else 
    {
        results = obj.results.map(p => p.name);
    }

    // Fetch pokemon data
    if (typeof results[0] === "string")
    {
        results = await Promise.all(
            results.map(async (name) => {
                try {
                    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
                    if (!response.ok)
                    {
                        throw new Error("Pokemon not found.")
                    }
                    return await response.json();
                } catch {
                    return null;
                }
            })
        );
    }

    // Remove nulls
    results = results.filter(p => p !== null);

    // Apply filters for pokemon types
    results = results.filter(p => {
        const types = p.types.map(t => t.type.name);
        let match1 = filters.type1 == "none" || types.includes(filters.type1);
        let match2 = filters.type2 == "none" || types.includes(filters.type2);
        return match1 && match2;
    });

    // Store results then reset page
    allResults = results;
    currentPage = 1;
    displayPage(currentPage);

}

function displayResults(results)
{
    // get content
    let content = document.querySelector("#content");

    // if no results are found display message
    if (results.length == 0)
    {
        content.innerHTML = `<p>No pokemon found</p>`;
        return;
    }

    // get bigString
    let bigString = "";

    // Loop through results
    for (let p of results)
    {
        // Find images for each result
        const img = p.sprites.other["official-artwork"].front_default || p.sprites.front_default;

        // Find typing for each result
        const types = p.types.map(t => t.type.name).join(", ");

        // Conjoin bigstring
        bigString += 
            `<div class="result">
                <img src="${img}" alt="${p.name}" title="${p.name}" width="120">
                <h3>${p.name.charAt(0).toUpperCase() + p.name.slice(1)}</h3>
                <p>Type: ${types}</p>
            </div>
        `;
    }

    // put big string into content
    content.innerHTML = bigString;

    // Update status
    document.querySelector("h2").innerHTML = `Found ${results.length} Pokemon`;
}

// Function to handle errors
function dataError(e)
{
    console.log("An error occured while fetching data: ", e);
    document.querySelector("#content").innerHTML = "<p>Error loading Pokemon data.</p>";
}

// function to allow for changing of pages between pokemon
function displayPage(page)
{
    // Create variables needed for each page
    const content = document.querySelector("#content");
    const start = (page - 1) * resultsPerPage;
    const end = start + resultsPerPage;
    const pageResults = allResults.slice(start, end);

    // if there no results update content status
    if (pageResults.length == 0)
    {
        content.innerHTML = `<p>No Pokemon Found</p>`;
        return;
    }

    // Create bigstring
    let bigString = "";

    // Loop through results
    for (let p of pageResults)
    {
        // Find images for each result
        const img = p.sprites.other["official-artwork"].front_default || p.sprites.front_default;

        // Find typing for each result
        const types = p.types.map(t => t.type.name).join(", ");

        // Conjoin bigstring
        bigString += 
            `<div class="result">
                <img src="${img}" alt="${p.name}" title="${p.name}" width="120">
                <h3>${p.name.charAt(0).toUpperCase() + p.name.slice(1)}</h3>
                <p>Type: ${types}</p>
            </div>
        `;
    }

    // Add bigstring to content
    content.innerHTML = bigString;
    
    // Add text for prev and back buttons
    document.querySelector("h2").innerHTML = `Showing ${start + 1}-${Math.min(end, allResults.length)} of ${allResults.length} Pokémon`;

}