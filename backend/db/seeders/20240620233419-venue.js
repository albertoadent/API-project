"use strict";

const { Venue } = require("../models");

let options = {};
if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA; // define your schema in options object
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
    await Venue.bulkCreate(
      [
        {
          groupId: 1,
          address: "123 Passion Lane",
          city: "Atlanta",
          state: "GA",
          lat: 1.23,
          lng: 23.56,
        },
        {
          groupId: 2,
          address: "123 Passion Lane",
          city: "Atlanta",
          state: "GA",
          lat: 1.23,
          lng: 23.56,
        },
        {
          groupId: 2,
          address: "1234 Passion Lane",
          city: "Atlanta",
          state: "GA",
          lat: 1.23,
          lng: 23.56,
        },
        {
          groupId: 1,
          address: "12345 Passion Lane",
          city: "Atlanta",
          state: "GA",
          lat: 1.23,
          lng: 23.56,
        },
        {
          groupId: 3,
          address: "123456 Passion Lane",
          city: "Atlanta",
          state: "GA",
          lat: 1.23,
          lng: 23.56,
        },
      ],
      { validate: true }
    );
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    options.tableName = "Venues";
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(
      options,
      {
        id: { [Op.in]: [1, 2,3,4,5] },
      },
      {}
    );
  },
};
