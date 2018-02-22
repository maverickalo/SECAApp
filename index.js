const sqlite = require('sqlite'),
  Sequelize = require('sequelize'),
  request = require('request'),
  express = require('express'),
  app = express();

const {
  PORT = 3000,
  NODE_ENV = 'development',
  DB_PATH = './db/database.db',
} = process.env;

const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: false,
    underscored: true,
  },
  logging: false,
  // SQLite only
  storage: './db/database.db',
});

const artistsModel = sequelize.define('artists', {
  name: Sequelize.STRING,
  birthday: Sequelize.DATE,
  deathday: Sequelize.DATE,
  gender: Sequelize.INTEGER,
  place_of_birth: Sequelize.STRING,
});

const genresModel = sequelize.define('genres', {
  id: { type: Sequelize.INTEGER, primaryKey: true },
  name: Sequelize.STRING,
});
const filmModel = sequelize.define('films', {
  id: { type: Sequelize.INTEGER, primaryKey: true },
  title: Sequelize.STRING,
  release_date: Sequelize.TEXT,
  tagline: Sequelize.STRING,
  revenue: Sequelize.STRING,
  budget: Sequelize.STRING,
  runtime: Sequelize.INTEGER,
  original_language: Sequelize.STRING,
  status: Sequelize.STRING,
  genre_id: Sequelize.INTEGER,
});
filmModel.hasOne(genresModel, { foreignKey: 'id' });
filmModel.belongsTo(genresModel);

const artistFilmsModel = sequelize.define('artist_films', {
  credit_type: Sequelize.STRING,
  role: Sequelize.STRING,
  description: Sequelize.STRING,
  artist_id: Sequelize.INTEGER,
  film_id: Sequelize.INTEGER,
});

const API =
  'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1';
// START SERVER
Promise.resolve()
  .then(() =>
    app.listen(PORT, () => console.log(`App listening on port ${PORT}`))
  )
  .catch(err => {
    if (NODE_ENV === 'development') console.error(err.stack);
  });
// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  filmModel
    .findOne({ where: { id: req.params.id }, include: [{ all: true }] })
    .then(({ genre }) => {
      const genreName = genre.name;
      return genreName;
    })
    .catch(err => {
      console.log(err);
    })
    .then(value => {
      filmModel
        .findAll({
          where: { '$genre.name$': value },
          include: [{ all: true }],
        })
        .then(film => {
          const list = film.map(a => {
            return a.id;
          });
          const requestList = list.toString();
          request(API + `?films=${requestList}`, function(err, response) {
            const filmId = requestList;
            const body = JSON.parse(response.body);
            const bodyMap = body.map(x => {
              return {
                movieID: x.film_id,
                reviews: x.reviews.map(x => {
                  const rating = x.rating;
                  return rating;
                }),
              };
            });

            const reviews = bodyMap.map(item => {
              return item.reviews;
            });
            const filter = reviews.filter(x => x.length > 2);
            const sum = filter.map(c => {
              const sum = c.reduce((a, b) => {
                return a + b;
              });
              const average = (sum / c.length).toFixed(2);
              return average;
            });
            res.send(sum);
          });
        });
    });
}

module.exports = app;
