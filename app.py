from flask import Flask, render_template, request, jsonify
import requests

from rdkit import Chem
from rdkit.Chem import Descriptors

import numpy as np

app = Flask(__name__)

# 🔥 Toxicity predictor
def predict_toxicity(logp, mw, h_donors, h_acceptors, tpsa):
    if logp > 5 or mw > 500 or tpsa > 140:
        return "Toxic ⚠️"
    else:
        return "Non-toxic ✅"


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    drug_name = data.get('drug')

    try:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{drug_name}/property/MolecularFormula,MolecularWeight,SMILES/JSON"
        response = requests.get(url)

        if response.status_code != 200:
            return jsonify({"error": "Drug not found"})

        props = response.json()['PropertyTable']['Properties'][0]
        smiles = props.get("SMILES")

        mol = Chem.MolFromSmiles(smiles)
        mol_block = Chem.MolToMolBlock(mol)

        # RDKit descriptors
        logp = Descriptors.MolLogP(mol)
        mol_weight = Descriptors.MolWt(mol)
        h_donors = Descriptors.NumHDonors(mol)
        h_acceptors = Descriptors.NumHAcceptors(mol)
        tpsa = Descriptors.TPSA(mol)

        # 🔥 Lipinski
        lipinski = [
            {"rule": "LogP ≤ 5", "pass": logp <= 5},
            {"rule": "MW ≤ 500", "pass": mol_weight <= 500},
            {"rule": "H-Donors ≤ 5", "pass": h_donors <= 5},
            {"rule": "H-Acceptors ≤ 10", "pass": h_acceptors <= 10}
        ]

        # 🔥 Toxicity
        toxicity = predict_toxicity(logp, mol_weight, h_donors, h_acceptors, tpsa)

        # Suggestions
        suggestions = []

        if logp > 5:
            suggestions.append("High lipophilicity → poor solubility. Add polar groups.")
        if mol_weight > 500:
            suggestions.append("High molecular weight → poor absorption.")
        if tpsa < 40:
            suggestions.append("Low TPSA → high permeability but low solubility.")

        if not suggestions:
            suggestions.append("Molecule within acceptable drug-like range.")

        return jsonify({
            "drug": drug_name,
            "formula": props.get("MolecularFormula"),
            "weight": props.get("MolecularWeight"),
            "smiles": smiles,
            "mol_block": mol_block,
            "logp": round(logp, 2),
            "rdkit_mw": round(mol_weight, 2),
            "h_donors": h_donors,
            "h_acceptors": h_acceptors,
            "tpsa": round(tpsa, 2),
            "suggestions": suggestions,
            "lipinski": lipinski,
            "toxicity": toxicity
        })

    except Exception as e:
        return jsonify({"error": str(e)})


import os

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
