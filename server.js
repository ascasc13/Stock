const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = 3000;

// Fonction pour générer un code-barres aléatoire
function generateBarcode() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Configuration d'Express
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Route pour la page d'accueil
app.get('/', (req, res) => {
    const totalEquipementsQuery = 'SELECT COUNT(*) AS total FROM equipement';
    const recentEquipementsQuery = `
        SELECT e.id, e.nom, m.nom AS marque, e.modele, e.code_barre, s.nom AS statut 
        FROM equipement e 
        JOIN marque m ON e.marque_id = m.id 
        JOIN status s ON e.status_id = s.id 
        ORDER BY e.id DESC LIMIT 5`;
    const statusCountsQuery = `
        SELECT s.nom AS status, COUNT(e.id) AS count 
        FROM equipement e 
        JOIN status s ON e.status_id = s.id 
        GROUP BY s.nom`;
    const typesQuery = 'SELECT * FROM type';
    const marquesQuery = 'SELECT * FROM marque';

    db.query(totalEquipementsQuery, (err, totalResults) => {
        if (err) return res.status(500).send(err);

        db.query(recentEquipementsQuery, (err, recentResults) => {
            if (err) return res.status(500).send(err);

            db.query(statusCountsQuery, (err, statusResults) => {
                if (err) return res.status(500).send(err);

                db.query(typesQuery, (err, typesResults) => {
                    if (err) return res.status(500).send(err);

                    db.query(marquesQuery, (err, marquesResults) => {
                        if (err) return res.status(500).send(err);

                        const statuses = statusResults.map(row => row.status);
                        const statusCounts = statusResults.map(row => row.count);

                        res.render('index', {
                            title: 'Bienvenue sur Stockorama',
                            totalEquipements: totalResults[0].total,
                            recentEquipements: recentResults,
                            statuses: statuses,
                            statusCounts: statusCounts,
                            types: typesResults,
                            marques: marquesResults
                        });
                    });
                });
            });
        });
    });
});

// Route pour la liste des équipements
app.get('/equipements', (req, res) => {
    const equipementsQuery = 'SELECT * FROM equipement';
    const marquesQuery = 'SELECT * FROM marque';
    const statusesQuery = 'SELECT * FROM status';

    db.query(equipementsQuery, (err, equipements) => {
        if (err) return res.status(500).send(err);

        db.query(marquesQuery, (err, marques) => {
            if (err) return res.status(500).send(err);

            db.query(statusesQuery, (err, statuses) => {
                if (err) return res.status(500).send(err);

                res.render('equipements', {
                    title: 'Liste des équipements',
                    equipements: equipements,
                    marques: marques,
                    statuses: statuses,
                    modifierVisible: false
                });
            });
        });
    });
});

// Route pour récupérer les détails d'un équipement spécifique
app.get('/equipements/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM equipement WHERE id = ?';

    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length > 0) {
            res.status(200).json(results[0]);
        } else {
            res.status(404).send('Équipement non trouvé');
        }
    });
});

// Route pour mettre à jour un équipement spécifique
app.put('/equipements/:id', (req, res) => {
    const { id } = req.params;
    const { nom, marque_id, status_id, code_barre } = req.body;
    const sql = 'UPDATE equipement SET nom = ?, marque_id = ?, status_id = ?, code_barre = ? WHERE id = ?';
    const values = [nom, marque_id, status_id, code_barre, id];

    db.query(sql, values, (err) => {
        if (err) return res.status(500).send(err);
        res.status(200).json({ message: 'Équipement mis à jour avec succès' });
    });
});

// Route pour la suppression d'un équipement
app.delete('/equipements/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM equipement WHERE id = ?';

    db.query(sql, [id], (err) => {
        if (err) return res.status(500).send(err);
        res.status(200).json({ message: 'Équipement supprimé avec succès' });
    });
});

// Route pour la page d'ajout
app.get('/ajouter', (req, res) => {
    const typesQuery = 'SELECT * FROM type';
    const marquesQuery = 'SELECT * FROM marque';
    const statusesQuery = 'SELECT * FROM status';

    db.query(typesQuery, (err, typesResults) => {
        if (err) return res.status(500).send(err);

        db.query(marquesQuery, (err, marquesResults) => {
            if (err) return res.status(500).send(err);

            db.query(statusesQuery, (err, statusesResults) => {
                if (err) return res.status(500).send(err);

                res.render('ajouter', {
                    title: 'Ajouter un équipement',
                    types: typesResults,
                    marques: marquesResults,
                    statuses: statusesResults
                });
            });
        });
    });
});

// Route pour ajouter un équipement
app.post('/equipements', (req, res) => {
    const { nom, type_id, marque_id, modele, status_id } = req.body;
    const code_barre = generateBarcode();
    const sql = 'INSERT INTO equipement (nom, type_id, marque_id, modele, code_barre, status_id) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [nom, type_id, marque_id, modele, code_barre, status_id];

    db.query(sql, values, (err) => {
        if (err) return res.json({ success: false, message: 'Erreur lors de l\'ajout de l\'équipement' });
        res.json({ success: true, message: 'Équipement ajouté avec succès' });
    });
});

// Route pour ajouter un type
app.post('/types', (req, res) => {
    const { nom_type } = req.body;
    const sql = 'INSERT INTO type (nom) VALUES (?)';

    db.query(sql, [nom_type], (err) => {
        if (err) return res.json({ success: false, message: 'Erreur lors de l\'ajout du type' });
        res.json({ success: true, message: 'Type ajouté avec succès' });
    });
});

// Route pour ajouter un statut
app.post('/statuses', (req, res) => {
    const { nom_statut } = req.body;
    const sql = 'INSERT INTO status (nom) VALUES (?)';

    db.query(sql, [nom_statut], (err) => {
        if (err) return res.json({ success: false, message: 'Erreur lors de l\'ajout du statut' });
        res.json({ success: true, message: 'Statut ajouté avec succès' });
    });
});

// Route pour ajouter une marque
app.post('/marques', (req, res) => {
    const { nom_marque } = req.body;
    const sql = 'INSERT INTO marque (nom) VALUES (?)';

    db.query(sql, [nom_marque], (err) => {
        if (err) return res.json({ success: false, message: 'Erreur lors de l\'ajout de la marque' });
        res.json({ success: true, message: 'Marque ajoutée avec succès' });
    });
});

// Route pour la gestion des codes-barres
app.get('/barcodes', (req, res) => {
    const queryEquipments = 'SELECT * FROM equipement';
    const queryMarques = 'SELECT * FROM marque';
    const queryStatuses = 'SELECT * FROM status';

    db.query(queryEquipments, (errEquip, resultsEquip) => {
        if (errEquip) return res.status(500).send(errEquip);

        db.query(queryMarques, (errMarq, resultsMarq) => {
            if (errMarq) return res.status(500).send(errMarq);

            db.query(queryStatuses, (errStat, resultsStat) => {
                if (errStat) return res.status(500).send(errStat);

                res.render('barcodes', {
                    title: 'Gestion des Codes-barres',
                    equipements: resultsEquip,
                    marques: resultsMarq,
                    statuses: resultsStat
                });
            });
        });
    });
});

// Route pour générer un nouveau code-barres pour un équipement spécifique
app.post('/generate-barcode', (req, res) => {
    const { equipmentId } = req.body;
    const newBarcode = generateBarcode();
    const sql = 'UPDATE equipement SET code_barre = ? WHERE id = ?';

    db.query(sql, [newBarcode, equipmentId], (err) => {
        if (err) return res.status(500).send(err);
        res.redirect('/barcodes');
    });
});

// Route pour générer plusieurs code
app.post('/generate-multiple-barcode-images', (req, res) => {
    const { equipmentIds } = req.body;

    // Vérification si equipmentIds est défini et est un tableau
    if (!Array.isArray(equipmentIds)) {
        return res.status(400).send('Invalid request: equipmentIds should be an array.');
    }

    const newBarcodes = equipmentIds.map(() => generateBarcode());

    // Utilisation de Promise pour gérer les requêtes asynchrones à la base de données
    const updatePromises = equipmentIds.map((id, index) => {
        const sql = 'UPDATE equipement SET code_barre = ? WHERE id = ?';
        return new Promise((resolve, reject) => {
            db.query(sql, [newBarcodes[index], id], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });

    Promise.all(updatePromises)
        .then(() => {
            res.redirect('/barcodes');
        })
        .catch((err) => {
            console.error('Erreur lors de la mise à jour des équipements :', err);
            res.status(500).send(err);
        });
});


// Lancement du serveur
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
