const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = 3000;

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
        if (err) {
            res.status(500).send(err);
            return;
        }

        db.query(recentEquipementsQuery, (err, recentResults) => {
            if (err) {
                res.status(500).send(err);
                return;
            }

            db.query(statusCountsQuery, (err, statusResults) => {
                if (err) {
                    res.status(500).send(err);
                    return;
                }

                db.query(typesQuery, (err, typesResults) => {
                    if (err) {
                        res.status(500).send(err);
                        return;
                    }

                    db.query(marquesQuery, (err, marquesResults) => {
                        if (err) {
                            res.status(500).send(err);
                            return;
                        }

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
    // Récupération des équipements avec leurs détails
    db.query('SELECT * FROM equipement', (err, equipements) => {
        if (err) {
            res.status(500).send(err);
            return;
        }

        // Vérification des données récupérées
        console.log("Équipements récupérés :", equipements);

        // Récupération des marques
        db.query('SELECT * FROM marque', (err, marques) => {
            if (err) {
                res.status(500).send(err);
                return;
            }

            // Vérification des données récupérées
            console.log("Marques récupérées :", marques);

            // Récupération des statuts
            db.query('SELECT * FROM status', (err, statuses) => {
                if (err) {
                    res.status(500).send(err);
                    return;
                }

                // Vérification des données récupérées
                console.log("Statuses récupérés :", statuses);

                // Rendu de la vue equipements.ejs avec les données récupérées
                res.render('equipements', {
                    title: 'Liste des équipements',
                    equipements: equipements,
                    marques: marques,
                    statuses: statuses,
                    modifierVisible: false // Ajout de cette ligne
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
        if (err) {
            res.status(500).send(err);
        } else {
            if (results.length > 0) {
                console.log("Détails de l'équipement récupérés :", results[0]); // Ajouter cette ligne pour déboguer
                res.status(200).json(results[0]);
            } else {
                res.status(404).send('Équipement non trouvé');
            }
        }
    });
});

// Route pour mettre à jour un équipement spécifique
app.put('/equipements/:id', (req, res) => {
    const { id } = req.params;
    const { nom, marque_id, status_id, code_barre } = req.body;

    const sql = 'UPDATE equipement SET nom = ?, marque_id = ?, status_id = ?, Code_barre = ? WHERE id = ?';
    const values = [nom, marque_id, status_id, code_barre, id];

    db.query(sql, values, (err, results) => {
        if (err) {
            console.error('Erreur lors de la mise à jour de l\'équipement :', err);
            res.status(500).send(err);
        } else {
            res.status(200).json({ message: 'Équipement mis à jour avec succès' });
        }
    });
});

// Route pour la suppression d'un équipement
app.delete('/equipements/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM equipement WHERE id = ?';

    db.query(sql, [id], (err, results) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.status(200).json({ message: 'Équipement supprimé avec succès' });
        }
    });
});

// Route pour la page d'ajout
app.get('/ajouter', (req, res) => {
    const typesQuery = 'SELECT * FROM type';
    const marquesQuery = 'SELECT * FROM marque';
    const statusesQuery = 'SELECT * FROM status';

    db.query(typesQuery, (err, typesResults) => {
        if (err) {
            res.status(500).send(err);
            return;
        }

        db.query(marquesQuery, (err, marquesResults) => {
            if (err) {
                res.status(500).send(err);
                return;
            }

            db.query(statusesQuery, (err, statusesResults) => {
                if (err) {
                    res.status(500).send(err);
                    return;
                }

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
    const { nom, type_id, marque_id, modele, code_barre, status_id } = req.body;
    const sql = 'INSERT INTO equipement (nom, type_id, marque_id, modele, code_barre, status_id) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [nom, type_id, marque_id, modele, code_barre, status_id];

    db.query(sql, values, (err, results) => {
        if (err) {
            res.json({ success: false, message: 'Erreur lors de l\'ajout de l\'équipement' });
        } else {
            res.json({ success: true, message: 'Équipement ajouté avec succès' });
        }
    });
});

// Route pour ajouter un type
app.post('/types', (req, res) => {
    const { nom_type } = req.body;
    const sql = 'INSERT INTO type (nom) VALUES (?)';
    db.query(sql, [nom_type], (err, results) => {
        if (err) {
            res.json({ success: false, message: 'Erreur lors de l\'ajout du type' });
        } else {
            res.json({ success: true, message: 'Type ajouté avec succès' });
        }
    });
});

// Route pour ajouter un statut
app.post('/statuses', (req, res) => {
    const { nom_statut } = req.body;
    const sql = 'INSERT INTO status (nom) VALUES (?)';
    db.query(sql, [nom_statut], (err, results) => {
        if (err) {
            res.json({ success: false, message: 'Erreur lors de l\'ajout du statut' });
        } else {
            res.json({ success: true, message: 'Statut ajouté avec succès' });
        }
    });
});

// Route pour ajouter une marque
app.post('/marques', (req, res) => {
    const { nom_marque } = req.body;
    const sql = 'INSERT INTO marque (nom) VALUES (?)';
    db.query(sql, [nom_marque], (err, results) => {
        if (err) {
            res.json({ success: false, message: 'Erreur lors de l\'ajout de la marque' });
        } else {
            res.json({ success: true, message: 'Marque ajoutée avec succès' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
