const express = require('express')

const {
  successResponse,
  handleResponse,
  handleApiError
} = require('../../apiHelpers')
const { respondToURSMRequestForSignature } = require('./URSMRegistrationComponentService')

const router = express.Router()

// Controllers

/**
 * Controller for `/ursm_request_for_signature` route
 * Calls `URSMRegistrationComponentService
 */
const respondToURSMRequestForProposalController = async (req) => {
  const { spID, timestamp, signature } = req.query

  const serviceRegistry = req.app.get('serviceRegistry')
  const logger = req.logger

  try {
    const response = await respondToURSMRequestForSignature(serviceRegistry, logger, spID, timestamp, signature)
    return successResponse(response)
  } catch (e) {
    return handleApiError(e)
  }
}

// Routes

router.get('/ursm_request_for_signature', handleResponse(respondToURSMRequestForProposalController))

module.exports = router