"use strict";

const { Image } = require("../models");

const options = {};

if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
     */
    await Image.bulkCreate(
      [
        {
          url: "imageUrl1",
          preview: false,
        },
        {
          url: "imageUrl2",
          preview: false,
        },
        {
          url: "imageUrl1",
          preview: false,
        },
        {
          url: "imageUrl2",
          preview: false,
        },
      ],
      { validate: true }
    );
  },

  async down(queryInterface, Sequelize) {
    options.tableName = "Images";
    await queryInterface.bulkDelete(
      options,
      {
        id: { [Sequelize.Op.in]: [1,2,3,4] },
      },
      {}
    );
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  },
};
