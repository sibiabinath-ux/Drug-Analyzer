let viewer = null;

function analyzeDrug() {
    const drug = document.getElementById("drugInput").value;

    document.getElementById("result").innerHTML =
        `<p class="text-center text-info">Analyzing...</p>`;

    fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug: drug })
    })
    .then(res => res.json())
    .then(data => {

        if (data.error) {
            document.getElementById("result").innerHTML =
                `<p class="text-danger text-center">${data.error}</p>`;
            return;
        }

        const viewerDiv = document.getElementById("viewer");

        viewerDiv.innerHTML = "";
        if (viewer) {
            viewer.clear();
            viewer = null;
        }

        viewer = $3Dmol.createViewer(viewerDiv, {
            backgroundColor: "#1e1e1e"
        });

        viewer.addModel(data.mol_block, "mol");
        viewer.setStyle({}, { stick: {}, sphere: { scale: 0.3 } });
        viewer.zoomTo();
        viewer.render();
        viewer.resize();

        // Lipinski
        let lipinskiHTML = "<ul class='list-group'>";
        data.lipinski.forEach(r => {
            let badge = r.pass
                ? "<span class='badge bg-success ms-2'>✔</span>"
                : "<span class='badge bg-danger ms-2'>✖</span>";

            lipinskiHTML += `<li class="list-group-item">${r.rule} ${badge}</li>`;
        });
        lipinskiHTML += "</ul>";

        // Suggestions
        let suggestionsHTML = "<ul class='list-group'>";
        data.suggestions.forEach(s => {
            suggestionsHTML += `<li class="list-group-item">${s}</li>`;
        });
        suggestionsHTML += "</ul>";

        document.getElementById("result").innerHTML = `
            <div class="card p-4 shadow-sm">

                <h3 class="text-center mb-3 fw-bold">${data.drug}</h3>

                <div class="row text-center mb-3">
                    <div class="col">
                        <span class="label">Formula</span><br>
                        <span class="value">${data.formula}</span>
                    </div>
                    <div class="col">
                        <span class="label">PubChem Weight</span><br>
                        <span class="value">${data.weight}</span>
                    </div>
                </div>

                <p><b>SMILES:</b> <span class="value">${data.smiles}</span></p>

                <hr>

                <h5>RDKit Analysis</h5>
                <div class="row text-center">
                    <div class="col"><span class="metric-label">LogP</span><br><span class="value">${data.logp}</span></div>
                    <div class="col"><span class="metric-label">MW</span><br><span class="value">${data.rdkit_mw}</span></div>
                    <div class="col"><span class="metric-label">H-Donors</span><br><span class="value">${data.h_donors}</span></div>
                    <div class="col"><span class="metric-label">H-Acceptors</span><br><span class="value">${data.h_acceptors}</span></div>
                    <div class="col"><span class="metric-label">TPSA</span><br><span class="value">${data.tpsa}</span></div>
                </div>

                <hr>

                <h5>Toxicity Prediction</h5>
                <p class="value">${data.toxicity}</p>

                <hr>

                <h5>Lipinski Rule Check</h5>
                ${lipinskiHTML}

                <hr>

                <h5>Optimization Suggestions</h5>
                ${suggestionsHTML}

            </div>
        `;
    });
}

