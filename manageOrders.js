import React, { Component } from 'react';
import { connect } from 'react-redux';
import { browserHistory } from 'react-router';
import moment from 'moment';
import _ from 'lodash';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/* Dialogs */
import TrackOrderOverlayDialog from '../../dialogs/trackOrderOverlayDialog';
import OrderStatusDescriptionsOverlayDialog from '../../dialogs/orderStatusDescriptionsOverlayDialog';
import ActionDescriptionsOverlayDialog from '../../dialogs/actionDescriptionsOverlayDialog';
import LineStatusDescriptionsOverlayDialog from '../../dialogs/lineStatusDescriptionsOverlayDialog';
import ProductStatusDescriptionsOverlayDialog from '../../dialogs/productStatusDescriptionsOverlayDialog';
import TargetArrivalDateDescriptionsOverlayDialog from '../../dialogs/targetArrivalDateDescriptionsOverlayDialog';
import ExpectedAvailableDateOverlayDialog from '../../dialogs/expectedAvailableDateOverlayDialog';
import ChangeRequestedDeliveryDateOverlayDialog from '../../dialogs/changeRequestedDeliveryDateOverlayDialog';
import GenericOverlayDialog from '../../dialogs/genericOverlayDialog';
import AddServicesForWorkOrderDialog from '../../dialogs/addServicesForWorkOrderDailog' ;

import BackOrderFilters from './backOrderFilterComponent';
//import CreateWorkOrder from './createWorkOrder';

import { routes } from '../../../redux/api/routes';
import { getOrderableServices } from '../../../redux/actions';

const {
	orders,
	bootAPIUrl,
	typeOfEmployeeAccessLevel
} = routes;
import {
	sendRequest
} from '../../../redux/api/sendRequest';

/* Actions */
import {
	saveBackOrders,
	getOrderList,
	getPIMItemInfo,
	getOrderDetails,
	getPOD,
	ajaxRequestInitiated,
	ajaxRequestCompleted,
	saveOrderShippingDetails,
	cancelOrderDetails,
	exportManageOrdersDetails,
	saveManageOrdersListBackup,
	getSignatureDetails,
	saveCreateOrderPayload,
    saveBookedOrders,
	checkAvailabilityGeneric,
	getPriceOrder,
	saveDeletedItems,
	getBillingReferences,
	saveBillingReferences,
	saveLookSerialNoData,
	checkServicePrices,
	deleteOrderDetails,
	saveOrderDetails,
	getShippingMethod,
	resetErrorLog,
	saveTrackingDetails
} from '../../../redux/actions';
import { PNET_APP_QUERY_PARAM } from '../../common/partsNetConstants';

const ALLOWED_CUSTOMERCLASSCODE = ["MULTIFAMILY FOR RENT", "MULTIFAMILY FOR SALE", "HOSPITALITY DIRECT NEW CONST", "HOSPITALITY DIRECT REHAB"]

class ManageOrders extends Component {

	constructor(props) {
		super(props);
		this.state = {
			invalidOrderNumberErrorMsg: '',
			batchSizeForGettingOrderDetails: 10,
			orderShippingDetailsList: [],
			pimDetailsList: [],
			showTrackOrderOverlayDialog: false,
			showOrderStatusDescriptionsOverlayDialog: false,
			showActionDescriptionsOverlayDialog: false,
			showLineStatusDescriptionsOverlayDialog: false,
			showTargetArrivalDateDescriptionsOverlayDialog: false,
			showProductStatusDescriptionsOverlayDialog: false,
			showExpectedAvailableDateOverlayDialog:false,
			showChangeRequestedDeliveryDateOverlayDialog: false,
			showDeleteOrderConfirmationOverlaydialog: false,
			showSuccessfullyCancelledOverlayDialog: false,
			showNoPODFoundOverlaydialog: false,
			showCancelOrderConfirmationOverlaydialog: false,
			editSiteId:'',
			agreementNumberUpdateBookedOrder:'',
			genericDialogHeading: '',
			genericDialogText: '',
			modalButtons: '',
			checkAvailabilityState:false,
			checkAvailabilityIndex :-1,
			selectedOrderNumber: '',
			orderDetails:{},
			accountNumber: '',
			errorMessage: '',
			ordersListResponse: null,
			backupOrdersListResponse: null,
			selectedOrderType: '',

			filterConfirmationMessage: '',

			isBookedOrderFetched: false,
			isEnteredOrderFetched: false,
			isClosedOrderFetched: false,
			// isBackOrderFetched: false,
			bookedOrders: null,
			enteredOrders: null,
			closedOrders: null,
			// backOrderOrders: null,
            showAddServicesForWorkOrderDialog : false,
			availableServices: null,
			sortBy: 'orderDate,desc',
			list:[],

			findSpecificOrderFilter: {
				param: {
					// dateRange: '30',
					ponumber: '',
					orderNumber: '',
					referenceNumber: '',
					invoiceNumber: '',
				},
				error: {
					// dateRangeError: '',
					ponumberError: '',
					orderNumberError: '',
					referenceNumberError: '',
					invoiceNumberError: '',
				}
			},

			fromDate: this.props.convertDateToTimeZone().add(-30, 'days'),
			toDate: this.props.convertDateToTimeZone(),
			maxFromDate: this.props.convertDateToTimeZone(),
			maxToDate: this.props.convertDateToTimeZone(),
			minToDate: this.props.convertDateToTimeZone().add(-routes.horizon, 'days'),
			invalidDateSelectionErrorMessage: '',
			findGroupOfOrders: {
				param: {
					orderType: 'BOOKED',
					fromDate: this.props.convertDateToTimeZone().add(-30, 'days').format('MM/DD/YYYY'),
					toDate: this.props.convertDateToTimeZone().format('MM/DD/YYYY'),
					productNumber: '',
					addressLine1: '',
					lot: ''
				},
				error: {
					orderTypeError: '',
					fromDateError: '',
					toDateError: '',
					productNumberError: '',
					addressLine1Error: '',
                    lotError: ''
				}
			},

			// using below flags to maintain status of parallel calls before redirecting to create order page
			isAvailabilityCallCompleted: false,
	        isPricingCallCompleted: false,
	        isPimCallCompleted: false,
			isGetOrgAttributesCallCompleted: false,
			isPriceOrderCallCompleted: false,
			isServicePriceCallCompleted: false,
			isShippingMethodCompleted: false,
			availabilityData: false,
	        pricingData: null,
	        pimData: null,

			last30DaysOrders: null,
			last60DaysOrders: null,
			isLast30DaysOrdersCompleted: false,
			isLast60DaysOrdersCompleted: false,
			isBillingPreferencesCallCompleted: false,

			createOrderPayload: null,

			orderDetailsByOrderNumber: [],
			deliveryDetails:[],
			filter: {
				shipToAddress: false,
				salesAgreement: this.props.isGEAPartsSalesAgreementSelected(),
				backorder: false
			},
			partsOrderDetailsList: []
		}
		this.validateFP = this.validateFP.bind(this);
		this.checkForNADate = this.checkForNADate.bind(this);
		this.checkIfInventoryFinancingAndHoldComments = this.checkIfInventoryFinancingAndHoldComments.bind(this);
		this.handleChangeFromDate = this.handleChangeFromDate.bind(this);
		this.handleChangeToDate = this.handleChangeToDate.bind(this);
		this.hideViewStatus = this.hideViewStatus.bind(this);
		this.getAttributeValueByLineId = this.getAttributeValueByLineId.bind(this);
		this.getAttributeValueByLineIdForSuggestedShipDate = this.getAttributeValueByLineIdForSuggestedShipDate.bind(this);
		this.getLineStatusByShipMethodAndLineStatus = this.getLineStatusByShipMethodAndLineStatus.bind(this);
		this.handleContinueEditOrder = this.handleContinueEditOrder.bind(this);
		this.hideFilterResultMessage = this.hideFilterResultMessage.bind(this);
		this.getOrderList = this.getOrderList.bind(this);
		this.fetchOrderShippingDetails = this.fetchOrderShippingDetails.bind(this);
		this.updateOrderListResponse = this.updateOrderListResponse.bind(this);
		this.checkAllParallelCallsAreCompleted = this.checkAllParallelCallsAreCompleted.bind(this);
		this.updateViewStatus = this.updateViewStatus.bind(this);
		this.updateAvailableActions = this.updateAvailableActions.bind(this);
		this.fetchServicesPrices = this.fetchServicesPrices.bind(this);
		this.getShippingAddressZipCode = this.getShippingAddressZipCode.bind(this);
		this.getShippingAddressState = this.getShippingAddressState.bind(this);
		this.checkParallelCallsCompleted = this.checkParallelCallsCompleted.bind(this);
		this.applyFilterParam = this.applyFilterParam.bind(this);
		this.handleCreateWorkOrder = this.handleCreateWorkOrder.bind(this);
		this.getLocTypeAccordingToDeliveryMethod = this.getLocTypeAccordingToDeliveryMethod.bind(this);
		this.checkIfStateIsAk = this.checkIfStateIsAk.bind(this);
		this.handleDialog = this.handleDialog.bind(this);
	}

	getIndexes(array, pickFromArray, value) {
		const indexes = [];
		array.forEach((itm, ind) => {
			if(itm === value)
				indexes.push(pickFromArray[ind]);
		});
		return indexes;
	}

	getShippingAddressZipCode() {
		const self = this;
		const { orderDetailsBkp } = self.state;
		if(orderDetailsBkp && orderDetailsBkp.shippingAddress && orderDetailsBkp.shippingAddress.zip) {
			return orderDetailsBkp.shippingAddress.zip.split("-")[0];
		}
		return self.props.getZipCode();
	}

	getShippingAddressState() {
		const self = this;
		const { orderDetailsBkp } = self.state;
		if(orderDetailsBkp && orderDetailsBkp.shippingAddress && orderDetailsBkp.shippingAddress.state) {
			return orderDetailsBkp.shippingAddress.state;
		}
		return null;
	}

	componentWillReceiveProps(nextProps) {
		const self = this;
		if(self.props.state.user.selectedAddress && self.props.state.user.selectedAddress !== nextProps.state.user.selectedAddress) {
			// filter orders if shipto filter is already selected
			self.applyFilterParam();
		}

		if (this.props.state.user.selectedPriceSource.AGREEMENT_TYPE !== nextProps.state.user.selectedPriceSource.AGREEMENT_TYPE) {
			if (nextProps.state.user.selectedPriceSource.AGREEMENT_TYPE === 'GEA Parts' && !this.state.filter.salesAgreement) {
				this.setState({
					filter: {
						...this.state.filter,
						salesAgreement: true
					}
				});
			} else if(nextProps.state.user.selectedPriceSource.AGREEMENT_TYPE !== 'GEA Parts' && this.state.filter.salesAgreement) {
				this.setState({
					filter: {
						...this.state.filter,
						salesAgreement: false
					}
				});
			}
			this.setState({
				ordersListResponse: null,
				backupOrdersListResponse: null,
				selectedOrderType: ''
			});
		}
	}

	componentWillMount() {
		const self = this;
		self.props.resetErrorLog();
		const { orderDetails, manageOrdersListBackup } = self.props.state.order;
		if(manageOrdersListBackup) {
			// if order details are there in store it means user is coming back to this page
			let { orderDetailsByOrderNumber, ordersListResponse } = manageOrdersListBackup;
			if(orderDetails && orderDetails.responseObject) {
				orderDetailsByOrderNumber = orderDetailsByOrderNumber.filter(itm => itm.orderNumber !== orderDetails.responseObject.orderNumber);
				ordersListResponse.responseObject.forEach(itm => {
					if(itm.orderHeader.orderNumber === orderDetails.responseObject.orderNumber) {
						itm.viewAvailableActions = true;
						itm.viewStatusLink = true;
					}
				});
			}
			self.setState({
				...manageOrdersListBackup,
				fromDate: moment(manageOrdersListBackup.fromDate),
				toDate: moment(manageOrdersListBackup.toDate),
				maxFromDate: moment(manageOrdersListBackup.maxFromDate),
				maxToDate: moment(manageOrdersListBackup.maxToDate),
				minToDate: moment(manageOrdersListBackup.minToDate),
				orderDetailsByOrderNumber,
				ordersListResponse
			}, () => {
				self.props.saveManageOrdersListBackup(null);
			});
		}
	}

	componentDidMount() {
		const self = this,
			accountNumber = self.props.getSelectedAccountNumber();
		if(accountNumber) {
			self.setState({
				accountNumber: accountNumber
			});
		} else {
			self.setState({
				errorMessage: 'No accountNumber found.'
			})
		}
		accountNumber && self.props.getAddressListCombinedDataByAccountNumber(accountNumber, (responseObj) => {
			self.setState({
				editSiteId : responseObj.siteUseId
			})
		})
	}

	getOrderList(queryString, callback) {
		const self = this;
		self.setState({
			ordersListResponse: null,
			backupOrdersListResponse: null,
			errorMessage: ''
		});
		self.props.getOrderList(queryString, (response) => {
			if(!response.status) {
				self.setState({
					errorMessage: response.responseMessage
				})
			} else {
				const sortBy = self.state.sortBy.split(',')[0],
					sortOrder = self.state.sortBy.split(',')[1];

				// check if any duplicate ordernumber record, then pick which is having highest invoiceNumber
				response.responseObject = response.responseObject || [];

				// Filter all orders which are 'Standard Sales' && excludes CANCELLED orders
				// remove all orders whose all products has been CANCELLED
				// agreement_type should not be 'GEA Parts'
				// check if all lines are not cancelled for left side and right side's ponumber search only
				const { whichTypeOfSearch, findSpecificOrderFilter } = self.state;
				response.responseObject = _.filter(response.responseObject, item => {
					const { attributes } = item.orderHeader;
					const attribute10No = attributes && attributes.attribute
						? attributes.attribute.find(itm => itm.name === 'Attribute10' && itm.value === 'NO')
						: null;
					// for right side search except ponumber search ignore line status
					// If the user searches for the specific order by CSO or Reference number, we would like to display the order
					if (whichTypeOfSearch === 'findSpecificOrder' && findSpecificOrderFilter.param.ponumber.trim() === '') {
						return !attribute10No &&
							item.orderHeader.orderType === 'Standard Sales' &&
							item.orderHeader.orderStatus !== 'CANCELLED' &&
							item.orderHeader.agreement_type !== 'GEA Parts'
					} else {
						return !attribute10No &&
							item.orderHeader.orderType === 'Standard Sales' &&
							item.orderHeader.orderStatus !== 'CANCELLED' &&
							item.orderHeader.agreement_type !== 'GEA Parts' &&
							item.orderDetail.orderLine.find(itm => itm.lineStatus.toUpperCase() !== 'CANCELLED');
					}
				});
				const {
					findSpecificOrderFilter: {
						param: {
							orderNumber,
							referenceNumber,
							invoiceNumber
						}
					}
				} = self.state;
				// filter out 1-YR or 2-YR or 4-YR items
				response.responseObject.forEach(item => {
					item.orderDetail.orderLine = item.orderDetail.orderLine.filter(itm => {
						const itemCode = (whichTypeOfSearch === 'findSpecificOrder' &&
								(orderNumber.trim() || referenceNumber.trim() || invoiceNumber.trim())
							)
								? (itm.internalItem || itm.item)
								: (itm.inventoryItem || itm.item);
						return !(itemCode.indexOf('1-YR') === 0 || itemCode.indexOf('2-YR') === 0 || itemCode.indexOf('4-YR') === 0);
					});
				});

				// For now below code is comment out as order status is going to pass in payload
				// Filter all orders which are either 'BOOKED' or 'CLOSED' or 'ENTERED'
				// response.responseObject = _.filter(response.responseObject, item => {
				// 	return item.orderHeader.orderStatus === 'BOOKED' || item.orderHeader.orderStatus === 'ENTERED' || item.orderHeader.orderStatus === 'CLOSED';
				// })

				// Sort all orders by default selected sorting order and field
				response.responseObject = _.orderBy(response.responseObject, (e) => { return e.orderHeader[sortBy]}, [sortOrder]);
				//Sort products by lineNum
				response.responseObject.forEach((item, index) => {
					const { orderHeader } = item;
					item.isPartAgreement = orderHeader.salesAgreement && orderHeader.salesAgreement.agreementName && orderHeader.salesAgreement.agreementName.toLowerCase().indexOf("parts") === 0 ? true : false;
					let allLinesAreClosed = true;
					let isAnyLineClosed = false;
					let allLinesAreBackOrderTransferred = true;
					let anyItemIsBackOrderHold = false;
					let allLinesAreClosedOrArrivedAtSDS = true;
					let allLineAreClosedOrCancelled = true;
					item.orderDetail.orderLine.forEach(itm => {
						if(self.props.checkItemIsServiceOrNot(itm.item) === 'service' || itm.lineStatus.toUpperCase() === 'CANCELLED') {
							return null;
						}
						const orderStatus = self.props.getLineStatusFromMapping(itm.item, orderHeader.shipmentMethod && orderHeader.shipmentMethod.description, itm.lineStatus, itm);
						if(orderStatus.toUpperCase() !== 'CLOSED') {
							allLinesAreClosed = false;
							allLineAreClosedOrCancelled = false;
						} else {
							isAnyLineClosed = true;
						}
						if(orderStatus !== 'Backorder Transferred') {
							allLinesAreBackOrderTransferred = false;
						}
						if(orderStatus.toUpperCase() === 'BACKORDER HOLD') {
							anyItemIsBackOrderHold = true;
						}
						if(!(orderStatus.toUpperCase() === 'CLOSED' || orderStatus.toUpperCase() === 'ARRIVED AT SDS')) {
							allLinesAreClosedOrArrivedAtSDS = false;
						}
						itm.lineNum = parseInt(itm.lineNum, 10);
					});
					item.allLinesAreClosed = allLinesAreClosed;
					item.isAnyLineClosed = isAnyLineClosed;
					item.allLinesAreBackOrderTransferred = allLinesAreBackOrderTransferred;
					item.anyItemIsBackOrderHold = anyItemIsBackOrderHold;
					item.allLinesAreClosedOrArrivedAtSDS = allLinesAreClosedOrArrivedAtSDS;
					item.allLineAreClosedOrCancelled = allLineAreClosedOrCancelled;
					item.orderDetail.orderLine = _.orderBy(item.orderDetail.orderLine, ['lineNum'], ['asc']);
				});

				callback && callback(response);
			}
		});
	}

	handleDialog(dialog, flag, event) {
		event && event.preventDefault();
		this.setState({
			['show'+dialog]: false
		}, () => {
			this.setState({
				['show'+dialog]: flag
			})
		})
	}

	hideViewStatus(currentIndex, orderNumber, shippingMethod, item, event, callback) {
		event && event.preventDefault();
		const self = this;
		// Fire gtm tag for cancel order
		self.props.fireGTMTag('Manage Order View Status', {
			orderNumber
		});
		// If all items are cancelled then no need to make any calls just hide the link, it will automatically shows cancelled
		const cancelledItems = item.orderDetail.orderLine.filter(itm => itm.lineStatus.toUpperCase() === 'CANCELLED');
		if(cancelledItems.length === item.orderDetail.orderLine.length) {
			const {
				ordersListResponse,
			} = self.state;
			ordersListResponse.responseObject[currentIndex].viewStatusLink = false;
			self.setState({
				ordersListResponse
			});
		} else {
			self.setState({
				getOrderShippingDetailsCallCompleted: false,
				currentOrderNumber: orderNumber,
				currentIndex,
			}, () => {
				// if(!orderDetails) {
				// 	self.props.getOrderDetails('orderNumber='+orderNumber+'&requestType=getOrderDetails&accountNumber='+self.props.getSelectedAccountNumber(), (response) => {
				// 		if(!response.status) {
				// 			self.setState({
				// 				errorMessage: response.responseMessage
				// 			})
				// 		} else {
				// 			const { orderDetailsByOrderNumber } = self.state;
				// 			orderDetailsByOrderNumber.push({
				// 				orderNumber,
				// 				response,
				// 			});
				// 			self.setState({
				// 				orderDetailsByOrderNumber,
				// 				getOrderDetailsCallCompleted: true,
				// 			}, () => {
				// 				self.updateViewStatus(shippingMethod, callback);
				// 			});
				// 		}
				// 	});
				// } else {
				// 	self.updateViewStatus(shippingMethod, callback);
				// }
				const {
					whichTypeOfSearch,
				} = self.state;
				if(whichTypeOfSearch === "findAllBackOrdersOrder" ||
					(self.isValidSearchForMakingGettingOrderShippingDetailsParallelCalls() && item.orderHeader.orderStatus === 'BOOKED')
				) {
					const { bkpOrderShippingDetailsList } = self.state;
					// We have already made calls and updated the required attributes so no need to make call again
					const getOrderShippingDetailsData = bkpOrderShippingDetailsList.find(itm => itm.orderdetoutrec && itm.orderdetoutrec.length && itm.orderdetoutrec[0].ordernumber.value.toString() === orderNumber);
					
					self.setState({
						getOrderShippingDetailsCallCompleted: true,
						getOrderShippingDetailsData: {
							responseObject: getOrderShippingDetailsData,
						}
					}, () => {
						self.updateViewStatus(shippingMethod, callback);
					});
				} else {
					self.props.getOrderShippingDetails(orderNumber, response => {
						if(!response.status || !response.responseObject) {
							self.setState({
								errorMessage: response.responseMessage
							});
						} else {
							self.setState({
								getOrderShippingDetailsCallCompleted: true,
								getOrderShippingDetailsData: response,
							}, () => {
								self.updateViewStatus(shippingMethod, callback);
							});
						}
					});
				}
				// fetch pim data
				self.fetchPimDetails([item], () => {
					self.updateViewStatus(shippingMethod, callback);
				});
			});
		}
	}

	getLineStatusByShipMethodAndLineStatus(shippingMethod, item) {
        if(shippingMethod.indexOf('SDS') !== -1) {
            const isodetailsrec = item.isodetailsrec && item.isodetailsrec.value;
            const isodetails = isodetailsrec && isodetailsrec.isodetails && isodetailsrec.isodetails[0];
            if(isodetails) {
                const csolinestatus = isodetails.csoflowstatuscode && isodetails.csoflowstatuscode.value;
                const isolinestatus = isodetails.isoflowstatuscode && isodetails.isoflowstatuscode.value;
                return csolinestatus === 'INTERNAL_REQ_OPEN' && isolinestatus === 'CLOSED' ? 'Shipped' : '';
            }
        } else if(shippingMethod === 'ADC Will Call') {
            const linestatus = item.formflowstatuscode && item.formflowstatuscode.value;
            return linestatus === 'Picked' ? 'Ready for Pickup' : '';
        }
        return '';
    }

	getAttributeValueByLineIdForSuggestedShipDate(details, orderDate ,attrName){
		let value = '';
		const isFromAccountClassificationInExceptionList = this.props.isAccountClassificationInExceptionList();
		let data = details && details.csobacklogdetailsrec && details.csobacklogdetailsrec.value && details.csobacklogdetailsrec.value.csobacklogdetails;
		if (data && data.length > 0 && data[0] && data[0][attrName] && data[0][attrName].value) {
			value = data[0][attrName].value;
		}else{
			if(moment(orderDate).isBetween(moment().add(-2, "days"), moment())){
				if(!isFromAccountClassificationInExceptionList){
					value =  details ? details.scheduleshipdate.value : "";
				}
				else{
					value = "1"
				}
			}else{
				value = ''
			}
		}
		return value;
	}

	getAttributeValueByLineId(details, attrName) {
		const self = this;
		let value = '';
		let data = details && details.isodetailsrec && details.isodetailsrec.value && details.isodetailsrec.value.isodetails;
		if (data && data.length) {
			data = data[0] && data[0].isobacklogdetailsrec && data[0].isobacklogdetailsrec.value && data[0].isobacklogdetailsrec.value.isobacklogdetails;
		}
		if (!data || data.length === 0) {
			data = details && details.csobacklogdetailsrec && details.csobacklogdetailsrec.value && details.csobacklogdetailsrec.value.csobacklogdetails;
		}
		if (data && data.length && data[0] && data[0][attrName] && data[0][attrName].value) {
			if (attrName === 'supplytype') {
				let details = null;
				let highestWeightage = 0;
				data.forEach(it => {
					const priorityDetails = self.props.state.order.productStatus.find(itm => itm.supplyType.toLowerCase() === it.supplytype.value.toLowerCase());
					if(priorityDetails && priorityDetails.weightagePriority > highestWeightage) {
						highestWeightage = priorityDetails.weightagePriority;
						details = it;
					}
				});
				const status = details && self.props.state.order.productStatus.find(itm => itm.supplyType.toLowerCase() === details.supplytype.value.toLowerCase());
				if(status) {
					value = status.productStatus;
				}
			} else {
				value = data[0][attrName].value;
			}
		}
		return value;
	}

	updateViewStatus(shippingMethod, callback) {
		const self = this;
		const {
			currentIndex,
			// currentOrderNumber,
			// orderDetailsByOrderNumber,
			// getOrderDetailsCallCompleted,
			getOrderShippingDetailsCallCompleted,
			getOrderShippingDetailsData,
			ordersListResponse,
			pimDetailsServiceCallsCompleted
		} = self.state;
		if(getOrderShippingDetailsCallCompleted && pimDetailsServiceCallsCompleted) {
			const { pimDetailsList } = self.state;
			const { orderHeader } = ordersListResponse.responseObject[currentIndex];
			ordersListResponse.responseObject[currentIndex].orderDetail.orderLine.forEach(itm => {
				if(self.props.checkItemIsServiceOrNot(itm.item) === 'service' || itm.lineStatus.toUpperCase() === 'CANCELLED') {
					return null;
				}
				const orderStatus = self.props.getLineStatusFromMapping(itm.item, orderHeader.shipmentMethod && orderHeader.shipmentMethod.description, itm.lineStatus, itm);
				if (orderStatus.toUpperCase() !== 'CLOSED') {
					const pimData = pimDetailsList.find(it => it.item_number === itm.item);
					if(pimData) {
						itm.finalProductionDate = pimData.geego_final_production_date;
					}
				}
			});
			ordersListResponse.responseObject[currentIndex].viewStatusLink = false;
			let orderLineShippingDetails = getOrderShippingDetailsData && getOrderShippingDetailsData.responseObject && getOrderShippingDetailsData.responseObject.orderdetoutrec;
			orderLineShippingDetails = orderLineShippingDetails && orderLineShippingDetails[0] && orderLineShippingDetails[0].linedetailsrec;
			orderLineShippingDetails = orderLineShippingDetails && orderLineShippingDetails.value && orderLineShippingDetails.value.linedetails;
			let planNameAndReservedAllLine = true;
			let anyItemHavingPlanName = false;
			const newLine = [];
			ordersListResponse.responseObject[currentIndex].orderDetail.orderLine.forEach(itm => {
				if(self.props.checkItemIsServiceOrNot(itm.item) !== 'service' && itm.lineStatus.toUpperCase() !== 'CANCELLED') {
					let data = orderLineShippingDetails.find(it => it.lineid.value === itm.orderLineId);
					// check supply type and set product status
					itm.productStatus = self.getAttributeValueByLineId(data, 'supplytype');
					itm.scheduledShipDate = self.getAttributeValueByLineId(data, 'scheduleshipdate');
					itm.scheduledShipDate = itm.scheduledShipDate ? self.props.convertDateToTimeZone(itm.scheduledShipDate).format('MM/DD/YYYY') : itm.scheduledShipDate;
					if(!itm.scheduledShipDate) {
						itm.scheduledShipDate = self.props.pickTheDateFromString(itm.scheduleShipDate);
					}
					itm.suggestedShipDate = self.getAttributeValueByLineId(data, 'suggestedshipdate');
					itm.suggestedShipDate = itm.suggestedShipDate ? self.props.convertDateToTimeZone(itm.suggestedShipDate).format('MM/DD/YYYY') : itm.suggestedShipDate;
					const dataReservedQty = JSON.parse(JSON.stringify(data));
					if(shippingMethod.toLowerCase().indexOf('sds') !== -1 || shippingMethod === 'Home Delivery') {
						data = data.isodetailsrec && data.isodetailsrec.value && data.isodetailsrec.value.isodetails;
						// PLAN NAME (TXXXXXXX) exists under the ISO Trip for every line that has an ISO
						if(data.length) {
							let temp = JSON.parse(JSON.stringify(data[0]));
							temp = temp.isodeliverydetailsrec && temp.isodeliverydetailsrec.value && temp.isodeliverydetailsrec.value.isodeliverydetails;
							temp = temp && temp.length && temp[0].tripdetailsrec && temp[0].tripdetailsrec.value ? temp[0].tripdetailsrec.value.tripdetails : null;
							if(!temp || temp.length === 0 || !(temp && temp.length === temp.filter(it => it.planname && it.planname.value).length)) {
								planNameAndReservedAllLine = false;
							}
							if (temp && temp.length && temp.find(it => it.planname && it.planname.value)) {
								anyItemHavingPlanName = true;
							}
						} else if(!dataReservedQty || !dataReservedQty.reservedquantity || dataReservedQty.reservedquantity.value !== itm.orderedQty) {
							planNameAndReservedAllLine = false;
						}
						data = data && data[0];
						if(data && data.isoreservationquantity) {
							itm.reserved = data.isoreservationquantity.value
						} else if(dataReservedQty && dataReservedQty.reservedquantity) {
							itm.reserved = dataReservedQty.reservedquantity.value
						}
					} else {
						data = data.deliverydetailsrec && data.deliverydetailsrec.value && data.deliverydetailsrec.value.deliverydetails;
						// PLAN NAME (TXXXXXXX) exists under the ISO Trip for every line that has an ISO
						if(data.length) {
							let temp1 = data[0];
							temp1 = temp1.tripdetailsrec && temp1.tripdetailsrec.value ? temp1.tripdetailsrec.value.tripdetails : null;
							if(!temp1 || temp1.length === 0 || !(temp1 && temp1.length === temp1.filter(it => it.planname && it.planname.value).length)) {
								planNameAndReservedAllLine = false;
							}
							if (temp1 && temp1.length && temp1.find(it => it.planname && it.planname.value)) {
								anyItemHavingPlanName = true;
							}
						} else if(!dataReservedQty || !dataReservedQty.reservedquantity || dataReservedQty.reservedquantity.value !== itm.orderedQty) {
							planNameAndReservedAllLine = false;
						}
						data = data && data[0];
						if(data && data.isoreservationquantity) {
							itm.reserved = data.isoreservationquantity.value
						} else if(dataReservedQty && dataReservedQty.reservedquantity) {
							itm.reserved = dataReservedQty.reservedquantity.value
						}
					}
				}
			});
			if (newLine.length) {
				// calculate planNameAndReservedAllLine again
				ordersListResponse.responseObject[currentIndex].orderDetail.orderLine = ordersListResponse.responseObject[currentIndex].orderDetail.orderLine.concat(newLine);
			}
			// Calculate ETA date
			let eta = '';
			ordersListResponse.responseObject[currentIndex].orderDetail.orderLine.forEach(itm => {
				if(self.props.checkItemIsServiceOrNot(itm.item) !== 'service' && itm.lineStatus.toUpperCase() !== 'CANCELLED') {
					eta = self.findSuggestedShipDate(itm, eta);
				}
			});
			eta = eta ? self.props.pickTheDateFromString(eta, 'MM/DD/YY') : eta;

			ordersListResponse.responseObject[currentIndex].eta = eta;
			ordersListResponse.responseObject[currentIndex].planNameAndReservedAllLine = planNameAndReservedAllLine;
			ordersListResponse.responseObject[currentIndex].anyItemHavingPlanName = anyItemHavingPlanName;
			self.setState({
				ordersListResponse
			}, () => {
				callback && callback();
			});
		}
	}

	checkIfInventoryFinancingAndHoldComments(orderHeader) {
		const self = this;
		let flag = false;
		const holdComments = [
			'SENT TO IF CO',
			'EMAIL SENT AND WAITING FOR APPROVAL',
			'PENDING',
			'REJECTED',
		];
		const { holds } = orderHeader;
		if (self.props.checkInventoryFinancingSA() &&
			holds && holds.hold && holds.hold.length > 0 && holds.hold.find(itm => holdComments.indexOf(itm.holdComments.toUpperCase()) !== -1)
		) {
			flag = true;
		}
		return flag;
	}

	updateAvailableActions() {	
		const self = this;
		let ordersListResponse = self.state.ordersListResponse;
		const {
			currentIndex,
			currentOrderNumber,
			orderDetailsByOrderNumber,
			getOrderDetailsCallCompleted,
		} = self.state;
		if(getOrderDetailsCallCompleted) {
			ordersListResponse.responseObject[currentIndex].viewAvailableActions = false;
			const response = orderDetailsByOrderNumber.find(itm => itm.orderNumber === currentOrderNumber).response;
			response.responseObject.items = response && response.responseObject.items && response.responseObject.items.filter((item)=>{ return item.item.toLowerCase().indexOf('handling') == -1}).filter((item)=>{ return item.item.toLowerCase().indexOf('delivery') == -1})
			ordersListResponse.responseObject[currentIndex].showDeleteButton = response.responseObject && response.responseObject.items && _.find(response.responseObject.items, {updatable: 'Yes'}) ? true : false;
			ordersListResponse.responseObject[currentIndex].updatable = false;
			if(response.responseObject && response.responseObject.items) {
				let data = JSON.parse(JSON.stringify(response.responseObject.items));
				data = data.filter(item => self.props.getItemTypeByName(item.item) === null && item.lineStatus && item.lineStatus.toUpperCase() !== 'CANCELLED');
				if(data) {
					ordersListResponse.responseObject[currentIndex].updatable = data.find(itm => itm.updatable === 'Yes') ? true : false;
				}
			}
			ordersListResponse.responseObject[currentIndex].cancelable = response.responseObject && response.responseObject.items && response.responseObject.items.find(itm => itm.cancelable !== 'Yes') ? false : true;
			ordersListResponse.responseObject[currentIndex].showViewSerialsButton = response.responseObject.items.find(itm => itm.serialNumber) ? true : false;
			ordersListResponse.responseObject[currentIndex].paymentType = response.responseObject && response.responseObject.paymentType;
			self.setState({
				ordersListResponse
			});
		}
	}

	hideViewAvailableActions(currentIndex, orderNumber, event) {
		event && event.preventDefault();
		const self = this,
			{ orderDetailsByOrderNumber } = self.state;
		const orderDetails = _.find(orderDetailsByOrderNumber, {orderNumber: orderNumber});
		self.setState({
			getOrderDetailsCallCompleted: orderDetails ? true : false,
			currentOrderNumber: orderNumber,
			currentIndex,
		}, () => {
			if(!orderDetails) {
				self.props.getOrderDetails('orderNumber='+orderNumber+'&requestType=getOrderDetails&accountNumber='+self.props.getSelectedAccountNumber(), (response) => {
					if(!response.status) {
						self.setState({
							errorMessage: response.responseMessage
						})
					} else {
						const { orderDetailsByOrderNumber } = self.state;
						orderDetailsByOrderNumber.push({
							orderNumber,
							response,
						});
						self.setState({
							orderDetailsByOrderNumber,
							getOrderDetailsCallCompleted: true,
						}, () => {
							self.updateAvailableActions();
						});
					}
				});
			} else {
				self.updateAvailableActions();
			}
		});
	}

	hideFilterResultMessage() {
		setTimeout(() => {
			this.setState({
				filterConfirmationMessage: ''
			})
		}, 2000)
	}

	handleFindSpecificOrder(event){
		event.preventDefault();
		const self = this;
		const searchForPartsOrder = self.props.isGEAPartsSalesAgreementSelected();
		self.setState({
			whichTypeOfSearch: 'findSpecificOrder',
			invalidOrderNumberErrorMsg: '',
		}, () => {
			const { findSpecificOrderFilter } = self.state;
			let anyError = false;
			if (
				(!self.props.isValidOrderNumer(findSpecificOrderFilter.param.orderNumber)) ||
				(!self.props.isValidReferenceNumber(findSpecificOrderFilter.param.referenceNumber, searchForPartsOrder))
			) {
				anyError = true;
			}
			if(!anyError && (findSpecificOrderFilter.param.ponumber !== '' || findSpecificOrderFilter.param.invoiceNumber !== '' || findSpecificOrderFilter.param.orderNumber !== '' || findSpecificOrderFilter.param.referenceNumber !== '')) {
				const {
					ponumber,
					orderNumber,
					referenceNumber,
					invoiceNumber
				} = findSpecificOrderFilter.param;
				if (orderNumber && !self.props.accept2DecimalNumbersOnly(orderNumber)) {
					self.setState({
						invalidOrderNumberErrorMsg: 'Order Number should be a numerical value',
						findSpecificOrderFilter: {
							...self.state.findSpecificOrderFilter,
							error: {
								...self.state.findSpecificOrderFilter.error,
								orderNumberError: 'error',
							}
						}
					});
					return;
				}
				const searchParameter = [];
				if(ponumber) {
					searchParameter.push('PO');
				}
				if(orderNumber) {
					searchParameter.push('CSO');
				}
				if(referenceNumber) {
					searchParameter.push('Order reference');
				}
				if(invoiceNumber) {
					searchParameter.push('Invoice');
				}
				self.props.fireGTMTag('Manage Order Search', {
					orderNumber: orderNumber ? orderNumber : (referenceNumber || undefined),
					searchParameter: searchParameter.join(',')
				});
				// if poNumber is not empty then we need to make another parallel call to get line level ponumber matches
				const poNumber = findSpecificOrderFilter.param.ponumber.trim().toUpperCase();
				self.setState({
					firstCallCompleted: false,
					firstCallData: null,
					secondCallCompleted: poNumber ? false : true,
					secondCallData: null,
					queryString: `accountNumber=${self.state.accountNumber}&requestType=manageOrders&orderNumber=${findSpecificOrderFilter.param.orderNumber.trim()}&poNumber=${encodeURIComponent(poNumber)}&referenceNumber=${findSpecificOrderFilter.param.referenceNumber.trim()}&invoiceNumber=${findSpecificOrderFilter.param.invoiceNumber.trim()}`,
				}, () => {
					// make parallel call in case ponumber is not empty
					self.getOrderList(self.state.queryString, (response) => {
						self.setState({
							firstCallCompleted: true,
							firstCallData: response
						}, () => {
							self.callBackAfterPONumberParallelCalls();
						});
					});
					if (!self.state.secondCallCompleted) {
						self.getOrderList(`${self.state.queryString}&searchLinePO=Y`, (response) => {
							const poNum = self.state.findSpecificOrderFilter.param.ponumber.trim().toUpperCase();
							// filter out lines which are not matching with ponumber
							response.responseObject = response.responseObject.filter((item) =>
								item.orderHeader.ponumber.toUpperCase().indexOf(poNum) === -1
							);
							response.responseObject.forEach((item) => {
								item.orderDetail.orderLine = item.orderDetail.orderLine.filter(itm => {
									return itm.lineCustomerPONumber && itm.lineCustomerPONumber.toUpperCase().indexOf(poNum) === 0
								});
								item.searchLinePO = true;
							});
							// response.responseObject = response.responseObject.filter((item) => item.orderDetail.orderLine.length > 0);
							self.setState({
								secondCallCompleted: true,
								secondCallData: response
							}, () => {
								self.callBackAfterPONumberParallelCalls();
							});
						});
					}
				});
			} else {
				const error = this.state.findSpecificOrderFilter.error;
				if (anyError) {
					if (!self.props.isValidOrderNumer(findSpecificOrderFilter.param.orderNumber)) {
						error.orderNumberError = 'error'
					}
					if (!self.props.isValidReferenceNumber(findSpecificOrderFilter.param.referenceNumber, searchForPartsOrder)) {
						error.referenceNumberError = 'error'
					}
				} else {
					if(findSpecificOrderFilter.param.ponumber === '') {
						error.ponumberError = 'error'
					}
					if(findSpecificOrderFilter.param.orderNumber === '') {
						error.orderNumberError = 'error'
					}
					if(findSpecificOrderFilter.param.referenceNumber === '') {
						error.referenceNumberError = 'error'
					}
					if(findSpecificOrderFilter.param.invoiceNumber === '') {
						error.invoiceNumberError = 'error'
					}
				}
				this.setState({
					findSpecificOrderFilter: {
						...this.state.findSpecificOrderFilter,
						error: error
					},
					filterConfirmationMessage: ''
				})
			}
		});
	}

	callBackAfterPONumberParallelCalls() {
		const self = this;
		const {
			firstCallData,
			firstCallCompleted,
			secondCallData,
			secondCallCompleted,
			findSpecificOrderFilter,
		} = self.state;
		if (firstCallCompleted && secondCallCompleted) {
			const filteredSecondCallData = secondCallData && secondCallData.responseObject ? secondCallData.responseObject : [];
			const response = {
				...firstCallData,
				responseObject: firstCallData.responseObject.concat(filteredSecondCallData)
			};
			if(response.responseObject && response.responseObject.length && (self.state.findSpecificOrderFilter.param.orderNumber || self.state.findSpecificOrderFilter.param.referenceNumber)) {
				// If any line has Holds…. holdName “Backorder Hold” … then only call search by po …. Both for order and reference number search….
				let isBackorderHold = false;
				response.responseObject[0].orderDetail.orderLine.forEach(itm => {
					const { holds } = itm;
					if(holds && holds.hold && holds.hold.length > 0 && _.find(holds.hold, {holdName: "Backorder Hold"})) {
						isBackorderHold = true;
					}
				});
				if(isBackorderHold) {
					const orderNumber = response.responseObject[0].orderHeader.orderNumber;
					self.getOrderList(`accountNumber=${self.state.accountNumber}&requestType=manageOrders&orderNumber=&poNumber=${encodeURIComponent(response.responseObject[0].orderHeader.ponumber)}&referenceNumber=`, (resp) => {
						resp.responseObject = resp.responseObject.filter(itm => itm.orderHeader.orderNumber === orderNumber);
						self.updateOrderListResponse(resp, findSpecificOrderFilter, 'specific');
					});
				} else {
					self.updateOrderListResponse(response, findSpecificOrderFilter, 'specific');
				}
			} else {
				self.updateOrderListResponse(response, findSpecificOrderFilter, 'specific');
			}
		}
	}

	isBulkOrderHold(orderHeader) {
		const {
			holds
		} = orderHeader;
		if(holds && holds.hold && holds.hold.length > 0 &&
			_.find(holds.hold, {holdName: "Bulk Order - Do not Ship"})
		) {
			return true;
		}
		return false;
	}

	handleFindAllBackOrders(event) {
		event.preventDefault();
		const self = this;
		self.props.fireGTMTag('Manage Order Search', {
			orderNumber: '',
			searchParameter: 'All Backorders'
		});
		self.setState({
			selectedOrderType: 'BACKORDER',
			sortBy: 'orderDate,desc',
			whichTypeOfSearch: 'findAllBackOrdersOrder',
			backOrdersData: null,
			bulkOrdersData: null,
			backOrdersCallCompleted: false,
			bulkOrdersCallCompleted: false,
		}, () => {
			self.getOrderList(`accountNumber=${self.state.accountNumber}&requestType=manageOrders&orderStatus=BACKORDER`, (response) => {
				const { findGroupOfOrders } = self.state;
				if(findGroupOfOrders.param.productNumber && findGroupOfOrders.param.productNumber !== '') {
					response.responseObject = _.filter(response.responseObject, item => {
						item.orderDetail.orderLine = _.filter(item.orderDetail.orderLine, itm =>
							itm.item.indexOf(findGroupOfOrders.param.productNumber.trim().toUpperCase()) === 0 && itm.lineStatus.toUpperCase() !== 'CANCELLED'
						);
						return item.orderDetail.orderLine.length > 0 ? item : null;
					});
				}
				self.setState({
					backOrdersCallCompleted: true,
					backOrdersData: response
				}, () => {
					self.callBackAfterBackBulkOrders();
				});
			});
			self.getOrderList(`accountNumber=${self.state.accountNumber}&requestType=manageOrders&orderStatus=bulkOrderHold`, (response) => {
				const { findGroupOfOrders } = self.state;
				if(findGroupOfOrders.param.productNumber && findGroupOfOrders.param.productNumber !== '') {
					response.responseObject = _.filter(response.responseObject, item => {
						item.orderDetail.orderLine = _.filter(item.orderDetail.orderLine, itm =>
							itm.item.indexOf(findGroupOfOrders.param.productNumber.trim().toUpperCase()) === 0 && itm.lineStatus.toUpperCase() !== 'CANCELLED'
						);
						return item.orderDetail.orderLine.length > 0 ? item : null;
					});
				}
				response.responseObject = response.responseObject.filter(item => self.isBulkOrderHold(item.orderHeader));
				self.setState({
					bulkOrdersCallCompleted: true,
					bulkOrdersData: response
				}, () => {
					self.callBackAfterBackBulkOrders();
				});
			});
		});
	}

	callBackAfterBackBulkOrders() {
		const self = this;
		const {
			backOrdersData,
			bulkOrdersData,
			backOrdersCallCompleted,
			bulkOrdersCallCompleted,
		} = self.state;
		if (backOrdersCallCompleted && bulkOrdersCallCompleted) {
			const response = JSON.parse(JSON.stringify(backOrdersData));
			response.responseObject = response.responseObject.concat(bulkOrdersData.responseObject);
			self.setState({
				backupOrdersListResponse: JSON.parse(JSON.stringify(response)),
				ordersListResponseForParallelCalls: JSON.parse(JSON.stringify(response)),
			}, () => {
				// If orderType is BACKORDER then need to make parallel order details calls
				self.fetchOrderDetailsList();
			});
		}
	}

	processBookedOrderResponse(response, keepAllClosedItems) {
		const self = this;
		const filteredData = [];
		const isGEAPartsSalesAgreementSelected = self.props.isGEAPartsSalesAgreementSelected();
		response && response.responseObject && response.responseObject.forEach((item) => {
			item.orderDetail.orderLine = item.orderDetail.orderLine.filter(itm => !(((isGEAPartsSalesAgreementSelected && item.orderHeader.orderSourceRef && item.orderHeader.orderSourceRef.startsWith('CTN') || !isGEAPartsSalesAgreementSelected) ?
											self.props.checkItemIsServiceOrNot(itm.item) === 'service' : false) || itm.lineStatus.toUpperCase() === 'CANCELLED'));
			if(keepAllClosedItems) {
				if (item.orderDetail.orderLine.length === item.orderDetail.orderLine.filter(itm => itm.lineStatus.toUpperCase() === 'CLOSED').length) {
					filteredData.push(item);
				}
			} else {
				if (item.orderDetail.orderLine.find(itm => itm.lineStatus.toUpperCase() !== 'CLOSED')) {
					filteredData.push(item);
				}
			}
		});
		return {
			...response,
			responseObject: filteredData
		};
	}

	isAllowedForDateRangeException(self) {
		const { selectedAccount } = self.props.state.user;
		const classificationCode = selectedAccount && selectedAccount.CUSTOMERCLASSCODE ? selectedAccount.CUSTOMERCLASSCODE.toUpperCase() : "";
		if(classificationCode && ALLOWED_CUSTOMERCLASSCODE.includes(classificationCode)){
			return false;
		}
		return true;
	}

	handleFindGroupsOfOrders(event) {
		event.preventDefault();
		const self = this;
		let { findGroupOfOrders, fromDate, toDate } = this.state;
		if(fromDate && toDate && fromDate.isAfter(toDate)) {
			self.setState({
				invalidDateSelectionErrorMessage : 'From date should be same or before to date'
			});
			return;
		}
		else if(this.isAllowedForDateRangeException(self) && fromDate && toDate && findGroupOfOrders.param.orderType && (findGroupOfOrders.param.orderType === "ALL" || findGroupOfOrders.param.orderType === "CLOSED")){
			const fromDateVal = new Date(fromDate);
			const toDateVal = new Date(toDate);
			const maxToDate = new Date(fromDateVal);
			maxToDate.setDate(maxToDate.getDate() + 185);
			if (toDateVal > maxToDate) {
				self.setState({
					invalidDateSelectionErrorMessage : 'When the Order Status is All or Closed, the date range cannot exceed 6 months'
				});
			return;
			} 
		}
		const searchParameter = `${findGroupOfOrders.param.fromDate}-${findGroupOfOrders.param.toDate}`;
		self.props.fireGTMTag('Manage Order Search', {
			orderNumber: '',
			searchParameter
		});
		self.setState({
			whichTypeOfSearch: 'findGroupsOfOrders',
			invalidDateSelectionErrorMessage :''
			// sortBy: findGroupOfOrders.param.orderType === "ALL" ? 'orderStatus,asc' : 'orderDate,desc',
		}, () => {
			if(findGroupOfOrders.param.orderType !== '' &&
				findGroupOfOrders.param.fromDate &&
				findGroupOfOrders.param.toDate &&
				!fromDate.isAfter(toDate)
			) {
				// Reseting flags and data
				self.setState({
					isBookedOrderFetched: false,
					isEnteredOrderFetched: false,
					isClosedOrderFetched: false,
					// isBackOrderFetched: false,
					bookedOrders: null,
					enteredOrders: null,
					closedOrders: null,
					// backOrderOrders: null,
					sortBy: 'orderDate,desc',
				}, () => {
					if(findGroupOfOrders.param.orderType === "ALL" || findGroupOfOrders.param.orderType === "CLOSED") {
						self.getOrderList(`accountNumber=${self.state.accountNumber}&requestType=manageOrders&fromDate=${findGroupOfOrders.param.fromDate}&toDate=${findGroupOfOrders.param.toDate}&orderStatus=BOOKED`, (response) => {
							const bookedData = self.processBookedOrderResponse(JSON.parse(JSON.stringify(response)), false);
							const closedData = self.processBookedOrderResponse(JSON.parse(JSON.stringify(response)), true);
							let finalData = null;
							// in case of closed we will keep only closed booked orders
							if (findGroupOfOrders.param.orderType === "CLOSED") {
								finalData = closedData;
							}
							// in case of ALL search we will make 2 copy of booked data and one will only contains closed and one will only contains booked
							// then we will have to keep both the data after concatenation
							else {
								// findGroupOfOrders.param.orderType === "ALL"
								finalData = {
									...bookedData,
									responseObject: bookedData.responseObject.concat(closedData.responseObject)
								};
								const sortBy = self.state.sortBy.split(',')[0],
									sortOrder = self.state.sortBy.split(',')[1];
								// Sort all orders by default selected sorting order and field
								finalData.responseObject = _.orderBy(finalData.responseObject, (e) => { return e.orderHeader[sortBy]}, [sortOrder]);
							}
							self.setState({
								isBookedOrderFetched: true,
								bookedOrders: finalData
							}, () => {
								self.checkAllParallelCallsAreCompleted(findGroupOfOrders);
							});
						});
						self.getOrderList(`accountNumber=${self.state.accountNumber}&requestType=manageOrders&fromDate=${findGroupOfOrders.param.fromDate}&toDate=${findGroupOfOrders.param.toDate}&orderStatus=CLOSED`, (response) => {
							self.setState({
								isClosedOrderFetched: true,
								closedOrders: response
							}, () => {
								self.checkAllParallelCallsAreCompleted(findGroupOfOrders);
							});
						});
						// if we have closed order type search then we need to exclude entered service call to reuse functionality
						if (findGroupOfOrders.param.orderType === "CLOSED") {
							self.setState({
								isEnteredOrderFetched: true,
								enteredOrders: {
									status: true,
									responseObject: []
								}
							}, () => {
								self.checkAllParallelCallsAreCompleted(findGroupOfOrders);
							});
						} else {
							self.getOrderList(`accountNumber=${self.state.accountNumber}&requestType=manageOrders&fromDate=${findGroupOfOrders.param.fromDate}&toDate=${findGroupOfOrders.param.toDate}&orderStatus=ENTERED`, (response) => {
								self.setState({
									isEnteredOrderFetched: true,
									enteredOrders: response
								}, () => {
									self.checkAllParallelCallsAreCompleted(findGroupOfOrders);
								});
							});
						}
					} else {
						self.getOrderList(`accountNumber=${self.state.accountNumber}&requestType=manageOrders&fromDate=${findGroupOfOrders.param.fromDate}&toDate=${findGroupOfOrders.param.toDate}&orderStatus=${findGroupOfOrders.param.orderType}`, (response) => {
							self.setState({
								selectedOrderType: findGroupOfOrders.param.orderType,
								sortBy: 'orderDate,desc',
							}, () => {
								self.updateOrderListResponse(findGroupOfOrders.param.orderType === "BOOKED" ? self.processBookedOrderResponse(response, false) : response, findGroupOfOrders, 'group');
							});
						});
					}
				});
			} else {
				const error = this.state.findGroupOfOrders.error;
				if(findGroupOfOrders.param.orderType === '') {
					error.orderTypeError = 'error';
				}
				if(!findGroupOfOrders.param.fromDate) {
					error.fromDateError = 'error';
				}
				if(!findGroupOfOrders.param.toDate) {
					error.toDateError = 'error';
				}
				let invalidDateSelectionErrorMessage = '';
				if(fromDate && toDate && fromDate.isAfter(toDate)) {
					invalidDateSelectionErrorMessage = 'From date should be same or before to date';
				}
				this.setState({
					findGroupOfOrders: {
						...this.state.findGroupOfOrders,
						error: error
					},
					filterConfirmationMessage: '',
					invalidDateSelectionErrorMessage,
				})
			}
		});
	}

	fetchOrderShippingDetails(whichBatch) {
		const self = this;
		const { batches } = self.state;
		const promises = [];
		batches[whichBatch - 1].forEach(item => {
			// Get Order Details: getOrderDetails in parallel
			promises.push(
				sendRequest(
					bootAPIUrl,
					orders.getOrderListBoot.path,
					'',
					orders.getOrderListBoot.method,
					'orderNumber='+item.orderHeader.orderNumber+'&requestType=getOrderShippingDetails&accountNumber='+self.props.getSelectedAccountNumber()
				)
			);
		});
		Promise.all(promises).then((responses) => {
			let combinedResponseObject = [];
			if (responses.length > 0) {
				responses.forEach(resp => {
					if (resp.status) {
						if (resp.responseObject) {
							combinedResponseObject = combinedResponseObject.concat(resp.responseObject);
						}
					} else {
						browserHistory.push('/error');
					}
				});
			}
			self.setState({
				orderShippingDetailsList: self.state.orderShippingDetailsList.concat(combinedResponseObject),
				deliveryDetails: self.state.deliveryDetails.concat(combinedResponseObject)
			}, () => {
				if (whichBatch < self.state.noOfBatches) {
					self.fetchOrderShippingDetails(whichBatch + 1);
				} else {
					self.setState({
						getOrderShippingDetailsCallCompleted: true
					}, () => {
						self.checkParallelCallsCompleted();
					});
					self.props.ajaxRequestCompleted();
				}
			});
		});
	}

	isPartsOrder = orderHeader => {
		const { selectedAccountsAllPriceSources } = this.props.state.user;
		const priceSources = selectedAccountsAllPriceSources.responseObject || [];

		const orderSalesAgreementNumber = orderHeader && orderHeader.salesAgreement && orderHeader.salesAgreement.agreementNumber;
		return orderSalesAgreementNumber && priceSources.some(priceSource => priceSource.AGREEMENT_NUMBER.toString() === orderSalesAgreementNumber.toString() && priceSource.AGREEMENT_TYPE === 'GEA Parts');
	}

	fetchPartsOrderDetails = (filter, callback) => {
		this.props.getOrderDetails(`requestType=getOrderDetails&P_ORDER_NUMBER=${filter.orderNumber ? filter.orderNumber.trim() : ''}&P_PO_NUMBER=${encodeURIComponent(filter.poNumber || '')}&ORIG_SYS_DOCUMENT_REF=${filter.referenceNumber ? filter.referenceNumber.trim() : ''}&P_INVOICE=${filter.invoiceNumber ? filter.invoiceNumber.trim() : ''}&${PNET_APP_QUERY_PARAM}`, response => {
			this.partsOrderDetailsList = (this.partsOrderDetailsList || []).concat({
				...filter,
				orderDetails: response.responseObject
			})

			if (this.requiredPartsOrderDetailsCallsCount === ++this.completedPartsOrderDetailsCallsCount) {
				callback && callback();
			}
		}, false, true);
	}

	processPartsOrderDetailsBatches = (batches, callback) => {
		if (batches.length) {
			const batch = batches.shift();
			this.requiredPartsOrderDetailsCallsCount = batch.length;
			this.completedPartsOrderDetailsCallsCount = 0;

			batch.forEach((filter => {
				this.fetchPartsOrderDetails(filter, () => {
					this.processPartsOrderDetailsBatches(batches, callback);
				})
			}))
		} else {
			this.requiredPartsOrderDetailsCallsCount = 0;
			this.completedPartsOrderDetailsCallsCount = 0;
			this.setState({
				partsOrderDetailsList: this.partsOrderDetailsList
			}, () => {
				this.partsOrderDetailsList = [];
				this.props.saveManageOrdersListBackup(JSON.parse(JSON.stringify(this.state)));
				callback && callback();
			})
		}
	}

	fetchPartsOrderDetailsListBy = (filters, callback) => {
		const batches = _.chunk(filters, 5);
		this.processPartsOrderDetailsBatches(batches, callback);
	}

	updateOrderListForPartsOrders = () => {
		const { ordersListResponse } = this.state;
		const partsOrderDetailsListFilters = [];

		ordersListResponse.responseObject && ordersListResponse.responseObject.forEach(order => {
			if (this.isPartsOrder(order.orderHeader)) {
				partsOrderDetailsListFilters.push({
					orderNumber: order.orderHeader.orderNumber
				});
			}
		});
		this.fetchPartsOrderDetailsListBy(partsOrderDetailsListFilters);
	}

	fetchOrderDetailsList() {
		const self = this;
		const { ordersListResponseForParallelCalls: ordersListResponse } = self.state;
		const list=[];
		if(ordersListResponse.responseObject && ordersListResponse.responseObject.length > 0) {
			self.props.ajaxRequestInitiated();
			const batches = _.chunk(ordersListResponse.responseObject, self.state.batchSizeForGettingOrderDetails);
			self.setState({
				batches,
				noOfBatches: batches.length,
				getOrderShippingDetailsCallCompleted: false,
				list: list
			}, () => {
				self.fetchOrderShippingDetails(1);
				self.fetchPimDetails(ordersListResponse.responseObject, self.checkParallelCallsCompleted);
				let updatedList = [...list];
				const promises = self.state.ordersListResponse.responseObject
					.filter(item => item.orderHeader.shipmentMethod.description === "FedEx Ground")
					.map(item => 
						new Promise((resolve) => {
							this.props.getOrderDetails(
								`requestType=getOrderDetails&P_ORDER_NUMBER=${item.orderHeader.orderNumber ? item.orderHeader.orderNumber.trim() : ''}&${PNET_APP_QUERY_PARAM}`,
								(response) => {
									updatedList.push({
										orderNumber: item.orderHeader.orderNumber,
										deliveryStatus: response && response.responseObject && response.responseObject.P_DELIVERY_STATUS_INFO_TBL
									});
									resolve();
								},
								false, 
								true
							);
						})
					);
				Promise.all(promises).then(() => {
					self.setState({ list: updatedList });
				});
			});
		}
	}

	fetchPimDetails(responseObject, callback) {
		const self = this;
		const skus = [];
		responseObject.forEach(order => {
			const { orderHeader } = order;
			order.orderDetail.orderLine.forEach(itm => {
				if(self.props.checkItemIsServiceOrNot(itm.item) === 'service' || itm.lineStatus.toUpperCase() === 'CANCELLED') {
					return null;
				}
				const orderStatus = self.props.getLineStatusFromMapping(itm.item, orderHeader.shipmentMethod && orderHeader.shipmentMethod.description, itm.lineStatus, itm);
				if (orderStatus.toUpperCase() !== 'CLOSED') {
					skus.push(itm.item);
				}
			});
		});
		// make service call to get pim details
		const skuListForPim = [];
		skus.forEach(sku => {
			if (!self.state.pimDetailsList.find(item => item.item_number === sku) && !skuListForPim.find(item => item === sku)) {
				skuListForPim.push(sku);
			}
		});
		if (skuListForPim.length) {
			self.setState({
				pimDetailsServiceCallsCompleted: false,
			}, () => {
				// Fetch pim item data in batches of 100
				self.props.getPimDataInBatches(skuListForPim, 100, responseObject => {
					self.setState({
						pimDetailsList: self.state.pimDetailsList.concat(responseObject),
						pimDetailsServiceCallsCompleted: true,
					}, () => {
						callback && callback();
					});
				});
			});
		} else {
			self.setState({
				pimDetailsServiceCallsCompleted: true,
			}, () => {
				callback && callback();
			});
		}
	}
	// This is call back of checking if all order shipping parallel calls are completed or not
	checkParallelCallsCompleted() {
		const self = this;
		if (self.state.pimDetailsServiceCallsCompleted && self.state.getOrderShippingDetailsCallCompleted) {
			const { backupOrdersListResponse: ordersListResponse, pimDetailsList, orderShippingDetailsList } = self.state;
			const newOrderShippingDetailsList = [];
			orderShippingDetailsList.forEach((item) => {
				if (item && item.orderdetoutrec && item.orderdetoutrec.length) {
					const details = item.orderdetoutrec[0];
					const orderNumber = details.ordernumber.value.toString();
					const listRespdetails = ordersListResponse.responseObject.find(itm => itm.orderHeader.orderNumber.toString() === orderNumber);
					const orderDate = listRespdetails.orderHeader.orderDate || ""
					const items = [];
					let suggestedShipDate = "";
					//const shipmentMethod = listRespdetails.orderHeader.shipmentMethod.description || "";
					const shippingMethod = details.shippingmethod.value;
					const lineDetails = details.linedetailsrec && details.linedetailsrec.value && details.linedetailsrec.value.linedetails;
					if (lineDetails) {
						lineDetails.forEach(itm => {
							const lineId = itm.lineid.value;
							const productStatus = self.getAttributeValueByLineId(itm, 'supplytype');
							let scheduledShipDate = self.getAttributeValueByLineId(itm, 'scheduleshipdate');
							if(!scheduledShipDate && listRespdetails) {
								const lineDt = listRespdetails.orderDetail.orderLine.find(line => line.orderLineId === lineId);
								scheduledShipDate = lineDt ? self.props.pickTheDateFromString(lineDt.scheduleShipDate) : '';
							}
							suggestedShipDate = self.getAttributeValueByLineIdForSuggestedShipDate(itm, orderDate, 'suggestedshipdate');
							const lineStatusFromOrderList = self.getLineStatusByShipMethodAndLineStatus(shippingMethod, itm);
							items.push({
								lineId,
								productStatus,
								scheduledShipDate: scheduledShipDate ? self.props.convertDateToTimeZone(scheduledShipDate).format('MM/DD/YYYY') : scheduledShipDate,
								suggestedShipDate: suggestedShipDate ? self.props.convertDateToTimeZone(suggestedShipDate).format('MM/DD/YYYY') : suggestedShipDate,
								lineStatusFromOrderListResponse: lineStatusFromOrderList ? lineStatusFromOrderList : ''
							});
						});
					}
					newOrderShippingDetailsList.push({
						orderNumber,
						items
					});
				}
			});
			ordersListResponse.responseObject.forEach((order) => {
				const { orderHeader } = order;
				const shippingMethod = orderHeader.shipmentMethod.description;
				const getOrderShippingDetailsData = orderShippingDetailsList.find(itm => itm.orderdetoutrec && itm.orderdetoutrec.length && itm.orderdetoutrec[0].ordernumber.value.toString() === orderHeader.orderNumber);
				let planNameAndReservedAllLine = true;
				if (getOrderShippingDetailsData) {
					let orderLineShippingDetails = getOrderShippingDetailsData && getOrderShippingDetailsData.orderdetoutrec;
					orderLineShippingDetails = orderLineShippingDetails && orderLineShippingDetails[0] && orderLineShippingDetails[0].linedetailsrec;
					orderLineShippingDetails = orderLineShippingDetails && orderLineShippingDetails.value && orderLineShippingDetails.value.linedetails;
					order.orderDetail.orderLine.forEach(itm => {
						if(self.props.checkItemIsServiceOrNot(itm.item) === 'service' || itm.lineStatus.toUpperCase() === 'CANCELLED') {
							return null;
						}
						let data = orderLineShippingDetails.find(it => it.lineid.value === itm.orderLineId);
						const dataReservedQty = JSON.parse(JSON.stringify(data));
						if(shippingMethod.toLowerCase().indexOf('sds') !== -1) {
							data = data.isodetailsrec && data.isodetailsrec.value && data.isodetailsrec.value.isodetails;
							// PLAN NAME (TXXXXXXX) exists under the ISO Trip for every line that has an ISO
							if(data.length) {
								let temp = JSON.parse(JSON.stringify(data[0]));
								temp = temp.isodeliverydetailsrec && temp.isodeliverydetailsrec.value && temp.isodeliverydetailsrec.value.isodeliverydetails;
								temp = temp && temp.length && temp[0].tripdetailsrec && temp[0].tripdetailsrec.value ? temp[0].tripdetailsrec.value.tripdetails : null;
								if(!temp || temp.length === 0 || !(temp && temp.length === temp.filter(it => it.planname && it.planname.value).length)) {
									planNameAndReservedAllLine = false;
								}
							} else if(!dataReservedQty || !dataReservedQty.reservedquantity || dataReservedQty.reservedquantity.value !== itm.orderedQty) {
								planNameAndReservedAllLine = false;
							}
							data = data && data[0];
							if(data && data.isoreservationquantity) {
								itm.reserved = data.isoreservationquantity.value
							} else if(dataReservedQty && dataReservedQty.reservedquantity) {
								itm.reserved = dataReservedQty.reservedquantity.value
							}
						} else {
							data = data.deliverydetailsrec && data.deliverydetailsrec.value && data.deliverydetailsrec.value.deliverydetails;
							// PLAN NAME (TXXXXXXX) exists under the ISO Trip for every line that has an ISO
							if(data.length) {
								let temp1 = data[0];
								temp1 = temp1.tripdetailsrec && temp1.tripdetailsrec.value ? temp1.tripdetailsrec.value.tripdetails : null;
								if(!temp1 || temp1.length === 0 || !(temp1 && temp1.length === temp1.filter(it => it.planname && it.planname.value).length)) {
									planNameAndReservedAllLine = false;
								}
							} else if(!dataReservedQty || !dataReservedQty.reservedquantity || dataReservedQty.reservedquantity.value !== itm.orderedQty) {
								planNameAndReservedAllLine = false;
							}
							data = data && data[0];
							if(data && data.isoreservationquantity) {
								itm.reserved = data.isoreservationquantity.value
							} else if(dataReservedQty && dataReservedQty.reservedquantity) {
								itm.reserved = dataReservedQty.reservedquantity.value
							}
						}
						const orderStatus = self.props.getLineStatusFromMapping(itm.item, orderHeader.shipmentMethod && orderHeader.shipmentMethod.description, itm.lineStatus, itm);
						if (orderStatus.toUpperCase() !== 'CLOSED') {
							const pimData = pimDetailsList.find(it => it.item_number === itm.item);
							if(pimData) {
								itm.finalProductionDate = pimData.geego_final_production_date;
							}
						}
					});
				}
				order.planNameAndReservedAllLine = planNameAndReservedAllLine;
			});
			self.setState({
				orderShippingDetailsList: newOrderShippingDetailsList,
				bkpOrderShippingDetailsList: JSON.parse(JSON.stringify(self.state.orderShippingDetailsList)),
				// ordersListResponse: JSON.parse(JSON.stringify(ordersListResponse)),
				backupOrdersListResponse: JSON.parse(JSON.stringify(ordersListResponse)),
			}, () => {
				// filter orders if shipto filter is already selected
				self.applyFilterParam();
			});
		}
	}
	// This is call back of if user is searching for All orders for group search
	checkAllParallelCallsAreCompleted(findGroupOfOrders) {
		const self = this;
		if(self.state.isBookedOrderFetched && self.state.isClosedOrderFetched && self.state.isEnteredOrderFetched) {
			self.setState({
				selectedOrderType: "ALL",
				sortBy: 'orderStatus,asc',
			}, () => {
				const response = self.state.enteredOrders;
				response.responseObject = response.responseObject.concat(self.state.bookedOrders.responseObject).concat(self.state.closedOrders.responseObject);
				self.updateOrderListResponse(response, findGroupOfOrders, 'group');
			});
		}
	}

	updateOrderListResponse(response, paramsContainer, filterBy) {
		const self = this;
		let ordersListResponse = JSON.parse(JSON.stringify(response));
		if(filterBy === 'group') {
			// if(paramsContainer.param.orderType && paramsContainer.param.orderType !== '' && paramsContainer.param.orderType !== 'ALL') {
				// ordersListResponse.responseObject = _.filter(ordersListResponse.responseObject, item => {
				// 	return item.orderHeader.orderStatus === paramsContainer.param.orderType;
				// });
			// }
			if(paramsContainer.param.productNumber && paramsContainer.param.productNumber !== '') {
				ordersListResponse.responseObject = _.filter(ordersListResponse.responseObject, item => {
					item.orderDetail.orderLine = _.filter(item.orderDetail.orderLine, itm =>
						itm.item.indexOf(paramsContainer.param.productNumber.trim().toUpperCase()) === 0 && itm.lineStatus.toUpperCase() !== 'CANCELLED'
					);
					return item.orderDetail.orderLine.length > 0 ? item : null;
				});
			}
			 if(paramsContainer.param.addressLine1 && paramsContainer.param.addressLine1 !== '') {
				let respAfterAddressLine1 = [];
                respAfterAddressLine1 = ordersListResponse.responseObject ? ordersListResponse.responseObject.length > 0 ? ordersListResponse.responseObject.filter(item => item.orderHeader.parties.party.filter(party => party.purpose === 'SHIP_TO')[0].party.partySites.site[0].siteLocation.locationId.split('|')[0].trim().toUpperCase().indexOf(paramsContainer.param.addressLine1.trim().toUpperCase()) !== -1) : null : null;
                ordersListResponse.responseObject = respAfterAddressLine1 ? respAfterAddressLine1.length > 0 ? respAfterAddressLine1 : [] :[]
            }
            if(paramsContainer.param.lot && paramsContainer.param.lot !== '') {
				let respAfterLot = [];
                respAfterLot = ordersListResponse.responseObject ? ordersListResponse.responseObject.length > 0 ? ordersListResponse.responseObject.filter(item => item.orderHeader.parties.party.filter(party => party.purpose === 'SHIP_TO')[0].party.partySites.site[0].siteLocation.locationId.split('|')[2].trim().toUpperCase().indexOf(paramsContainer.param.lot.trim().toUpperCase()) !== -1) : null:null;
                ordersListResponse.responseObject = respAfterLot ? respAfterLot.length > 0 ? respAfterLot : [] : [];
            } 
		} else if(filterBy === 'specific'){
			// if(paramsContainer.param.ponumber.trim() && paramsContainer.param.ponumber.trim() !== '') {
			// 	ordersListResponse.responseObject = _.filter(ordersListResponse.responseObject, item => {
			// 		return item.orderHeader.ponumber.toUpperCase().indexOf(paramsContainer.param.ponumber.trim().toUpperCase()) !== -1;
			// 	});
			// }
			if(paramsContainer.param.orderNumber.trim() && paramsContainer.param.orderNumber.trim() !== '') {
				ordersListResponse.responseObject = _.filter(ordersListResponse.responseObject, item => {
					return item.orderHeader.orderNumber === paramsContainer.param.orderNumber.trim();
				});
			}
			if(paramsContainer.param.invoiceNumber.trim() && paramsContainer.param.invoiceNumber.trim() !== '') {
				ordersListResponse.responseObject = _.filter(ordersListResponse.responseObject, item => {
					return item.orderHeader.invoices && item.orderHeader.invoices.invoice && item.orderHeader.invoices.invoice.find(itm => itm.invoiceNumber === paramsContainer.param.invoiceNumber.trim());
				});
			}
		}

		self.setState({
			// ordersListResponse: ordersListResponse,
			backupOrdersListResponse: JSON.parse(JSON.stringify(ordersListResponse)),
		}, () => {
			// filter orders if shipto filter is already selected
			self.applyFilterParam(() => {
				if(self.isValidSearchForMakingGettingOrderShippingDetailsParallelCalls()) {
					const ordersListResponseForParallelCalls = JSON.parse(JSON.stringify(self.state.ordersListResponse));
					if (ordersListResponseForParallelCalls && ordersListResponseForParallelCalls.responseObject) {
						ordersListResponseForParallelCalls.responseObject = ordersListResponseForParallelCalls.responseObject.filter(itm => itm.orderHeader.orderStatus === 'BOOKED');
					}
					self.setState({
						ordersListResponseForParallelCalls
					}, () => {
						self.fetchOrderDetailsList();
					});
				}
			})
		})
	}

	isValidSearchForMakingGettingOrderShippingDetailsParallelCalls() {
		const self = this;
		const {
			whichTypeOfSearch,
			findGroupOfOrders,
			findSpecificOrderFilter,
		} = self.state;
		let flag = false;
		// 1. if search by group orders and search by ALL or BOOKED then its true
		// 2. if search by specific order and not by invoice number then its true
		// 3. if search by find all back orders then its true
		if (
			(whichTypeOfSearch === 'findGroupsOfOrders' && (findGroupOfOrders.param.orderType === "ALL" || findGroupOfOrders.param.orderType === "BOOKED")) ||
			(whichTypeOfSearch === 'findSpecificOrder' && !findSpecificOrderFilter.param.invoiceNumber) ||
			(whichTypeOfSearch === 'findAllBackOrdersOrder')
		) {
			flag = true;
		}
		return flag;
	}

	updateParams(formName, event) {
		//Reseting Errors on change
		const error = this.state[formName].error;
		for (let key in error) {
			if (error.hasOwnProperty(key)) {
				error[key] = '';
			}
		}
		this.setState({
			[formName]: {
				...this.state[formName],
				param: {
					...this.state[formName].param,
					[event.target.name]: event.target.name === 'backorder' ? event.target.checked : event.target.value
				},
				error: error
			},
			filterConfirmationMessage: '',
			invalidOrderNumberErrorMsg: event.target.name === 'orderNumber' ? '' : this.state.invalidOrderNumberErrorMsg
		}, () => {
			this.hideFilterResultMessage();
		})
	}

	handleSortBy(event) {
		let sortBy = event.target.value.split(',')[0],
			sortOrder = event.target.value.split(',')[1],
			ordersListResponse = this.state.ordersListResponse,
			isAnyDateFilter = sortBy.indexOf('Date') !== -1;
		const self = this;
		const { findGroupOfOrders } = self.state;
		ordersListResponse = _.orderBy(self.state.ordersListResponse.responseObject, (e) => {
			return !isAnyDateFilter?e.orderHeader[sortBy]:self.props.formatDate(e.orderHeader[sortBy], 'YYYY/MM/DD')
		}, [sortOrder]);
		if(self.state.whichTypeOfSearch === 'findGroupsOfOrders' && findGroupOfOrders.param.orderType === "ALL" && event.target.value === 'orderDate,desc' && isAnyDateFilter) {
			ordersListResponse = _.orderBy(self.state.ordersListResponse.responseObject, (e) => {
				return self.props.formatDate(e.orderHeader[sortBy], 'YYYY/MM/DD')
			}, [sortOrder]);
		} else if(self.state.whichTypeOfSearch === 'findGroupsOfOrders' && findGroupOfOrders.param.orderType === "ALL" && event.target.value === 'orderStatus,asc') {
			const enteredOrders = [];
			const bookedOrders = [];
			const closedOrders = [];
			const other = [];
			ordersListResponse.forEach(item => {
				if(item.orderHeader.orderStatus === 'ENTERED') {
					enteredOrders.push(item);
				} else if(item.orderHeader.orderStatus === 'BOOKED') {
					bookedOrders.push(item);
				} else if(item.orderHeader.orderStatus === 'CLOSED') {
					closedOrders.push(item);
				} else {
					other.push(item);
				}
			});
			ordersListResponse = enteredOrders.concat(bookedOrders).concat(closedOrders).concat(other);
		}
		self.setState({
			sortBy: event.target.value,
			ordersListResponse: {
				...self.state.ordersListResponse,
				responseObject: ordersListResponse
			}
		})
	}

	handleResetForm(whichForm, event) {
		if(whichForm === 'group') {
			this.setState({
				fromDate: this.props.convertDateToTimeZone().add(-routes.horizon, 'days'),
				toDate: this.props.convertDateToTimeZone(),
				invalidDateSelectionErrorMessage: '',
				findGroupOfOrders: {
					param: {
						orderType: 'ALL',
						fromDate: this.props.convertDateToTimeZone().add(-routes.horizon, 'days').format('MM/DD/YYYY'),
						toDate: this.props.convertDateToTimeZone().format('MM/DD/YYYY'),
						productNumber: ''
					},
					error: {
						orderTypeError: '',
						fromDateError: '',
						toDateError: '',
						productNumberError: ''
					}
				},
				filter: {
					shipToAddress: false,
					salesAgreement: false,
				},
			});
		} else {
			this.setState({
				findSpecificOrderFilter: {
					param: {
						// dateRange: '30',
						ponumber: '',
						orderNumber: '',
						referenceNumber: '',
						invoiceNumber: '',
					},
					error: {
						// dateRangeError: '',
						ponumberError: '',
						orderNumberError: '',
						referenceNumberError: '',
						invoiceNumberError: '',
					}
				},
				ordersListResponse: null
			})
		}
	}

	handleDeleteOrder(orderNumber, event) {
		event.preventDefault();
		this.setState({
			selectedOrderNumber: orderNumber,
			genericDialogHeading: 'Confirm Delete',
			genericDialogText: 'Are you sure you want to delete this order?',
			modalButtons: 'yes,no'
		});
		this.handleDialog('DeleteOrderConfirmationOverlaydialog', true, event);
	}

	handleCancelYesConfirmation(event) {
		this.handleDialog('DeleteOrderConfirmationOverlaydialog', false, event);
		event && event.preventDefault();
		const self = this;

		self.props.cancelOrderDetails({}, 'orderNumber='+self.state.selectedOrderNumber+'&requestType=deleteOrder', (response) => {
			if(!response.status || !response.responseObject) {
				self.setState({
					genericDialogHeading: 'Delete Order',
					genericDialogText: 'There is an error deleting this order. Please try after some time or call customer care.',
					modalButtons: 'ok'
				}, () => {
					self.handleDialog('SuccessfullyCancelledOverlayDialog', true, null);
				});
			} else {
				let ordersListResponse = _.filter(self.state.ordersListResponse.responseObject, (itm) => {
					return itm.orderHeader.orderNumber !== self.state.selectedOrderNumber
				});
				let backupOrdersListResponse = _.filter(self.state.backupOrdersListResponse.responseObject, (itm) => {
					return itm.orderHeader.orderNumber !== self.state.selectedOrderNumber
				});
				self.setState({
					ordersListResponse: {
						...self.state.ordersListResponse,
						responseObject: ordersListResponse
					},
					backupOrdersListResponse: {
						...self.state.backupOrdersListResponse,
						responseObject: backupOrdersListResponse
					},
					genericDialogHeading: 'Delete Order',
					genericDialogText: 'Order has been successfully deleted.',
					modalButtons: 'ok'
				}, () => {
					//Save manage order list into store
					self.props.saveManageOrdersListBackup(JSON.parse(JSON.stringify(this.state)));
					self.handleDialog('SuccessfullyCancelledOverlayDialog', true, null);
				});
			}
		})
	}

	handleManageBackorders(event) {
		event.preventDefault();
		const self = this;
		self.props.checkForBackOrders(self.props.getSelectedAccountNumber(), true, response => {
			//Save manage order list into store
			self.props.saveManageOrdersListBackup(JSON.parse(JSON.stringify(self.state)));
			browserHistory.push('/backOrders');
		});
	}

	handleCancelOrder(orderNumber, event) {
		event.preventDefault();
		this.setState({
			selectedOrderNumber: orderNumber,
			genericDialogHeading: 'Confirm Cancel',
			genericDialogText: 'Are you sure you want to cancel this order?',
			modalButtons: 'yes,no'
		});
		this.handleDialog('CancelOrderConfirmationOverlaydialog', true, event);
	}

	handleCancelEntireOrderConfirmation(event) {
		this.handleDialog('CancelOrderConfirmationOverlaydialog', false, event);
		event.preventDefault();
		const self = this,
			{ orderDetailsByOrderNumber } = self.state;
		const orderDetails = _.find(orderDetailsByOrderNumber, {orderNumber: self.state.selectedOrderNumber});
		const { userDetails } = self.props.state.user;
		const payload = {
			...orderDetails.response.responseObject,
			createdById: userDetails.sso,
			createdBy: userDetails.firstName + " " + userDetails.lastName,
			email: userDetails.email,
		};
		// Fire gtm tag for cancel order
		self.props.fireGTMTag('Manage Order Cancel Order', {
			orderNumber: self.state.selectedOrderNumber,
		});
		self.props.deleteOrderDetails(payload, 'requestType=cancelOrder', true, response => {
			if(!response.status || !response.responseObject) {
				self.setState({
					errorMessage: response.responseMessage
				})
			} else {
				const responseObject = _.filter(self.state.ordersListResponse.responseObject, itm => itm.orderHeader.orderNumber !== self.state.selectedOrderNumber);
				self.setState({
					ordersListResponse: {
						...self.state.ordersListResponse,
						responseObject
					},
					genericDialogHeading: 'Cancel Order',
					genericDialogText: 'Order has been successfully cancelled.',
					modalButtons: 'ok'
				}, () => {
					//Save manage order list into store
					self.props.saveManageOrdersListBackup(JSON.parse(JSON.stringify(self.state)));
					self.handleDialog('SuccessfullyCancelledOverlayDialog', true, null);
				});
			}
		})
	}

	handleFetchOrderDetails(orderNumber, orderStatus, wheretoRedirect, orderHeader, event) {
		event.preventDefault();
		const self = this,
			{ orderDetailsByOrderNumber } = self.state;
		let isOrderDetailsCallRequired = true;
		self.props.saveTrackingDetails(self.state.list)
		if (self.props.isGEAPartsSalesAgreementSelected() && self.isPartsOrder(orderHeader)) {
			this.fetchPartsOrderDetailsListBy([{orderNumber}], () => {
				const partsOrder = self.state.partsOrderDetailsList.find(partsOrder => partsOrder.orderNumber === orderNumber);

				self.props.saveOrderDetails({
					responseObject: partsOrder.orderDetails
				});
				browserHistory.push('/' + wheretoRedirect);
			})
			return;
		}

		if(wheretoRedirect === 'proofofdelivery') {
			if (orderHeader.shipmentMethod.description === "SDS Delivery") {
				// make call to get pdf url
				isOrderDetailsCallRequired = false;
				self.props.getPOD(`requestType=POD&orderNumber=${orderNumber}`, (response) => {
					if (response.status && response.responseObject) {
						Object.keys(response.responseObject).forEach(item => {
							window.open(response.responseObject[item]);
						});
					} else {
						self.setState({
							genericDialogHeading: 'Error',
							genericDialogText: 'Error occured while fetching POD documents.',
							modalButtons: 'ok',
						}, () => {
							self.handleDialog('NoPODFoundOverlaydialog', true);
						});
					}
				});
			} else {
				self.props.getSignatureDetails('orderNumber='+orderNumber+'&requestType=getSignature');
			}
		}
		if (isOrderDetailsCallRequired) {
			// only fire tag if user clicks on order number
			self.props.fireGTMTag('Manage Order View Order', {
				orderNumber
			});
			const orderDetails = _.find(orderDetailsByOrderNumber, {orderNumber: orderNumber});
			self.setState({
				getOrderDetailsCallCompleted: orderDetails ? true : false,
				getOrderShippingDetailsCallCompleted: !(wheretoRedirect === 'orderdetails'),
			}, () => {
				self.props.saveOrderShippingDetails(null);
				if(!orderDetails) {
					self.props.getOrderDetails('orderNumber='+orderNumber+'&requestType=getOrderDetails&accountNumber='+self.props.getSelectedAccountNumber(), (response) => {
						if(!response.status || !response.responseObject) {
							self.setState({
								errorMessage: response.responseMessage
							});
						} else {
							self.setState({
								getOrderDetailsCallCompleted: true
							}, () => {
								self.callbackAfterServiceCall(response, wheretoRedirect)
							});
						}
					});
				} else {
					self.callbackAfterServiceCall(orderDetails.response, wheretoRedirect)
				}
				if(wheretoRedirect === 'orderdetails') {
					if(orderStatus === 'CLOSED' || orderStatus === 'BOOKED') {
						const {
							whichTypeOfSearch,
						} = self.state;
						if(whichTypeOfSearch === "findAllBackOrdersOrder" ||
							(self.isValidSearchForMakingGettingOrderShippingDetailsParallelCalls() && orderHeader.orderStatus === 'BOOKED')
						) {
							const { bkpOrderShippingDetailsList } = self.state;
							
							// We have already made calls and updated the required attributes so no need to make call again
							const getOrderShippingDetailsData = bkpOrderShippingDetailsList.find(itm => itm.orderdetoutrec && itm.orderdetoutrec.length && itm.orderdetoutrec[0].ordernumber.value.toString() === orderNumber);
							self.setState({
								getOrderShippingDetailsCallCompleted: true,
								getOrderShippingDetailsData: {
									responseObject: getOrderShippingDetailsData,
								}
							}, () => {
								self.callbackAfterServiceCall(null, wheretoRedirect)
							});
						} else {
							
							self.props.getOrderShippingDetails(orderNumber, response => {
								if(!response.status || !response.responseObject) {
									self.setState({
										errorMessage: response.responseMessage
									});
								} else {
									self.setState({
										getOrderShippingDetailsCallCompleted: true,
										getOrderShippingDetailsData: response,
									}, () => {
										self.callbackAfterServiceCall(null, wheretoRedirect)
									});
								}
							});
						}
					} else {
						
						self.setState({
							getOrderShippingDetailsCallCompleted: true,
							getOrderShippingDetailsData: null,
						}, () => {
							self.callbackAfterServiceCall(null, wheretoRedirect)
						});
					}
				}
			});
		}
	}

	// Calculate Expected available date or product Status
	// This function is common for both of them.
	calculateAttributeValue(
		orderStatus,
		allLinesAreClosed,
		allLinesAreClosedOrArrivedAtSDS,
		planNameAndReservedAllLine,
		shippingMethod,
		returnValue,
		orderHeader,
		isReservedQuantityToReturn = false,
	) {
		const self = this;
		const finalValue = orderStatus.toUpperCase() !== 'CLOSED'
			? (
				(self.state.selectedOrderType === 'BACKORDER')
					?(isReservedQuantityToReturn ? returnValue : (orderStatus === 'Backorder Available' ? null : returnValue))
					:
						(
							(allLinesAreClosed &&
								(shippingMethod.indexOf('SDS') === 0 ||
									shippingMethod === 'Home Delivery' ||
									shippingMethod === 'ADC Will Call' ||
									shippingMethod === 'ADC Truckload' ||
									shippingMethod === 'ADC LTL' ||
									shippingMethod === 'Meet Truck'
								)
							) ||
							((shippingMethod.indexOf('SDS') === 0 || shippingMethod === 'Home Delivery') &&
								(allLinesAreClosedOrArrivedAtSDS || planNameAndReservedAllLine)
							)
								? null
								: (orderStatus.toUpperCase() === 'ARRIVED AT SDS' ? null : returnValue)
						)
			)
			: null

		return finalValue;
	}

	handleUpdateBookedOrder(currentIndex, allLinesAreClosed, allLinesAreClosedOrArrivedAtSDS, orderNumber, shippingMethod, expectedAvailableDateDetails, item, event) {
		event && event.preventDefault();
		const self = this;
		const skuList = [];
		item.orderDetail.orderLine.filter(itm=> itm.orderedQty != 0).slice(0,30).forEach((itm, index) => {
			let newItem = itm.internalItem || itm.inventoryItem
			if(!self.props.isMService(newItem) && !newItem.includes("UNCRATE") && !newItem.includes("DELIVERY") && !newItem.includes("HOME DELIVERY") && !newItem.includes("HANDLING")){
			skuList.push({
				itemNumber: newItem,
				qty: itm.orderedQty,
				shipSet: 1,
				identifier: itm.lineNum,
				agreementNumber: JSON.parse(localStorage.getItem("gessouserdetailscnet")).selectedPriceSource.AGREEMENT_NUMBER
			});
		}
		})
		const payload = {
			accountNumber: self.props.getSelectedAccountNumber(),
			warehouseCode:JSON.parse(localStorage.getItem("gessouserdetailscnet")).customADC,
			customerSiteId: self.state.editSiteId,
			items: skuList
		};
		this.props.checkAvailabilityGeneric(payload, 'requestType=orderAvailability', '', true, response => {
			response.responseObject.every(el=>{
				if(el.requestedDateQuantity == "" || el.shipDate == ""){
					this.setState({
					checkAvailabilityState : true,
					checkAvailabilityIndex:currentIndex
					})	
				}
			})
			if(response.responseCode == 200 && response.responseObject.length >= 0 && !this.state.checkAvailabilityState ){
				self.props.checkIfAnyActiveSoldAddress(() => {
					// In case of back order search all expected available date are already populated
					if(self.state.selectedOrderType === 'BACKORDER') {
						self.continueUpdateBookedOrder(orderNumber, expectedAvailableDateDetails);
					}
					// if user has already clicked on view status then expected available date are already populated
					else if(expectedAvailableDateDetails.find(itm => itm.expectedAvailableDate)) {
						self.continueUpdateBookedOrder(orderNumber, expectedAvailableDateDetails);
					}
					// else get whatever data required same like on click of view status
					else {
						self.hideViewStatus(currentIndex, orderNumber, shippingMethod, item, null, () => {
							const { ordersListResponse } = self.state;
							const expectedAvailableDateDetails = [];
							const item = ordersListResponse.responseObject[currentIndex];
							const { orderHeader, orderDetail } = item;
							orderDetail.orderLine.forEach((itm, ind) => {
								if(self.props.checkItemIsServiceOrNot(itm.item) === 'service' || itm.lineStatus.toUpperCase() === 'CANCELLED') {
									return null;
								}
								const orderStatus = self.props.getLineStatusFromMapping(itm.item, orderHeader.shipmentMethod && orderHeader.shipmentMethod.description, itm.lineStatus, itm);
								let odrDtl = null;
								odrDtl = self.state.orderDetailsByOrderNumber.find(order => order.orderNumber === orderHeader.orderNumber);
								odrDtl = odrDtl && odrDtl.response && odrDtl.response.responseObject ? odrDtl.response.responseObject : null;
								let suggestedShipDate = '';
								const isFromAccountClassificationInExceptionList = self.props.isAccountClassificationInExceptionList();
								if(odrDtl) {
									const itemDetail = odrDtl.items.find(it => it.lineId.toString() === itm.orderLineId.toString());
									if(self.state.selectedOrderType === 'BACKORDER' || (self.isValidSearchForMakingGettingOrderShippingDetailsParallelCalls() && orderHeader.orderStatus === 'BOOKED')) {
										suggestedShipDate = itemDetail && itemDetail.suggestedShipDate ? self.props.pickTheDateFromString(itemDetail.suggestedShipDate, 'MM/DD/YY') : self.props.pickTheDateFromString(itemDetail.scheduleShipDate, 'MM/DD/YY');
										if(!suggestedShipDate) {
											// For the classifications in this lookup, we should display ONLY the Suggested Ship Date from the shipping service.  If there is no value, we should display no ETA, not "NA".
											if (isFromAccountClassificationInExceptionList) {
												suggestedShipDate = '';
											} else {
												// WCP-7556:
												// If there is no suggested ship date, and the order date is within today -2 days,
												// we should continue to display scheduled ship date.
												if (moment(orderHeader.orderDate).isBetween(moment().add(-2, "days"), moment())) {
													suggestedShipDate = itemDetail && itemDetail.scheduledShipDate ? self.props.pickTheDateFromString(itemDetail.scheduledShipDate, 'MM/DD/YY') : '';
												}
											}
										}
									} else {
										if(itm.reserved < itm.orderedQty) {
											suggestedShipDate = itm.suggestedShipDate;
											if (!suggestedShipDate) {
												// For the classifications in this lookup, we should display ONLY the Suggested Ship Date from the shipping service.  If there is no value, we should display no ETA, not "NA".
												if (isFromAccountClassificationInExceptionList) {
													suggestedShipDate = '';
												} else {
													// WCP-7556:
													// If there is no suggested ship date, and the order date is within today -2 days,
													// we should continue to display scheduled ship date.
													if (moment(orderHeader.orderDate).isBetween(moment().add(-2, "days"), moment())) {
														suggestedShipDate = itm.scheduledShipDate;
													}
												}
											}
											suggestedShipDate = suggestedShipDate ? self.props.convertDateToTimeZone(suggestedShipDate).format('MM/DD/YY') : self.props.convertDateToTimeZone(itemDetail.scheduledShipDate).format('MM/DD/YY');
										} else if(itm.reserved === itm.orderedQty) {
											suggestedShipDate = '';
										}
									}
								}
								// WCP-7556 if not orderdate between today - 2 days then check FP logic
								if (itm.finalProductionDate && itm.finalProductionDate !== 'NULL' && !moment(orderHeader.orderDate).isBetween(moment().add(-2, "days"), moment())) {
									// If there is a FP date before today, display FP in the Expected Available Date
									if (moment(itm.finalProductionDate,'YYYYMMDD').isBefore(moment()) || 
										(moment(itm.finalProductionDate,'YYYYMMDD').isAfter(moment()) && 
										!moment(suggestedShipDate).isAfter(moment().add(routes.horizon, "days").hours(0).minutes(0).seconds(0).milliseconds(0)) &&
										suggestedShipDate != 'NULL' )) {
										suggestedShipDate = self.validateFP({finalProductionDate: itm.finalProductionDate, suggestedShipDate});
									} else {
										// else If there is not an FP date before today, display NA in the Expected Available Date
										suggestedShipDate = 'NA'
									}
								}
								// keep existing logic as it is in case not between today - 2 days
								else if (suggestedShipDate && itm.finalProductionDate) {
									suggestedShipDate = self.validateFP({finalProductionDate: itm.finalProductionDate, suggestedShipDate});
								}
								let expectedAvailableDate = self.calculateAttributeValue(orderStatus, allLinesAreClosed, allLinesAreClosedOrArrivedAtSDS, item.planNameAndReservedAllLine, shippingMethod, suggestedShipDate, orderHeader);
								expectedAvailableDate = self.checkForNADate(expectedAvailableDate, suggestedShipDate, orderStatus, isFromAccountClassificationInExceptionList);
								expectedAvailableDateDetails.push({
									index: ind,
									item: itm.item,
									expectedAvailableDate
								});
		
							});
							self.continueUpdateBookedOrder(orderNumber, expectedAvailableDateDetails);
						});
					}
				});}
			this.setState({
				checkAvailabilityState : false,
				})
		})
		
	}

	continueUpdateBookedOrder(orderNumber, expectedAvailableDateDetails) {
		const self = this;
		let attributeName = "geego_top_load";
		self.props.getOrgAttributesByAttributeName("Top Load Indicator", resp => {
			if(!resp) {
				attributeName = "geego_no_top_load";
			}
			const { orderDetailsByOrderNumber } = self.state;
			const orderDetails = _.find(orderDetailsByOrderNumber, {orderNumber: orderNumber});
			if(orderDetails) {
				orderDetails.response.responseObject.items.forEach((item, i) => {
					item.item = item.internalItem;
				});
				orderDetails.response.responseObject.items = orderDetails.response.responseObject.items.filter(item => {
					const itemCode = item.item;
					return !(itemCode.indexOf('1-YR') === 0 || itemCode.indexOf('2-YR') === 0 || itemCode.indexOf('4-YR') === 0);
				});
				self.props.getItemTypeByOrderDetails(orderDetails.response.responseObject, resp => {
					if(!resp.status) {
						self.setState({
							errorMessage: resp.responseMessage
						});
					} else {
						const { response: respn } = orderDetails;
						let reservedData = self.state.ordersListResponse.responseObject.find(order => order.orderHeader.orderNumber === respn.responseObject.orderNumber);
						reservedData = reservedData && reservedData.orderDetail ? reservedData.orderDetail.orderLine : null;
						respn.responseObject.items = respn.responseObject.items.filter(item => self.props.getItemTypeByName(item.item) !== 'S');
						respn.responseObject.items.forEach(item => {
							const itemTypeData = resp.orderDetails.items.find(itm => itm.item === item.item);
							const data = reservedData.find(itm => itm.orderLineId.toString() === item.lineId.toString());
							if(data && (data.reserved || data.reserved === 0)) {
								item.reserved = data.reserved;
							}
							if(itemTypeData) {
								item.orgItemType = itemTypeData.itemType;
								item.itemType = itemTypeData.itemType;
							}
							const pimItemData = _.find(resp.pimData, {item_number: item.item});
							if (pimItemData) {
								item.pointValue = pimItemData[attributeName] && pimItemData[attributeName] !== 'NULL' ? parseFloat(pimItemData[attributeName] * item.quantity) : 0.00;
								item.perItemPointValue = pimItemData[attributeName] && pimItemData[attributeName] !== 'NULL' ? parseFloat(pimItemData[attributeName]) : 0.00;
								item.weight = self.props.getOrderWeightFromPimData(pimItemData, item.quantity);
								item.perItemWeight = self.props.getOrderWeightFromPimData(pimItemData, 1);
							}
							item.customUncrateInd = itemTypeData.customUncrateInd;
							// Remove all related services
							delete item.relatedServices;
							item.originalQuantity = item.quantity;
							let expectedAvailableDate = '';
							if(expectedAvailableDateDetails.find(itm => itm.orderLineId == item.lineId)) {
								expectedAvailableDate = expectedAvailableDateDetails.find(itm => itm.orderLineId == item.lineId).expectedAvailableDate;
							}
							item.expectedAvailableDate = expectedAvailableDate;
							item.redirectFrom = 'updatebookedorder';
						});
						// Exclude items which are from that exclude list and cancelled
						let data = JSON.parse(JSON.stringify(respn));
						data.responseObject.items = data.responseObject.items.filter(item => self.props.getItemTypeByName(item.item) === null && item.lineStatus && item.lineStatus.toUpperCase() !== 'CANCELLED');
						data.responseObject.items.forEach((item) => {
							const pimItemData = _.find(self.state.pimDetailsList, { item_number: item.item });
							if (pimItemData) {
								const hasSubstitute = pimItemData.relationship_type && pimItemData.relationship_type.indexOf("Substitute") !== -1 ?true:false;
								const substituteSKUs = hasSubstitute ? self.getIndexes(pimItemData.relationship_type, pimItemData.related_item_number, "Substitute") : [];
								item.hasSubstitute = hasSubstitute;
								item.substituteSKUs = substituteSKUs;
							}
						});
						self.props.saveOrderDetails(data);
						//Save manage order list into store
						self.props.saveManageOrdersListBackup(JSON.parse(JSON.stringify(self.state)));
						browserHistory.push('/order/updatebookedorder');
					}
				});
			}
		});
	}

	callbackAfterServiceCall(orderDetails, wheretoRedirect) {
		const self = this;
		if (orderDetails) {
			if(wheretoRedirect === 'orderdetails') {
				orderDetails.responseObject.redirectFrom = 'manageorder';
			}
			self.props.saveOrderDetails(orderDetails);
		}
		//Save manage order list into store
		self.props.saveManageOrdersListBackup(JSON.parse(JSON.stringify(self.state)));
		if(wheretoRedirect === 'lookupserialno') {
			self.props.saveLookSerialNoData(orderDetails.responseObject);
			browserHistory.push('/' + wheretoRedirect);
		} else if(wheretoRedirect === 'orderdetails') {
			const { getOrderDetailsCallCompleted, getOrderShippingDetailsCallCompleted, getOrderShippingDetailsData } = self.state;
			if(getOrderDetailsCallCompleted && getOrderShippingDetailsCallCompleted) {
				self.props.saveOrderShippingDetails(getOrderShippingDetailsData);
				browserHistory.push('/' + wheretoRedirect);
			}
		} else if (wheretoRedirect) {
			browserHistory.push('/' + wheretoRedirect);
		}
	}

	getDeliveryDateByItem(response, lineItemId){
		const dates = [];
		if(response && response.responseObject && response.responseObject.orderdetoutrec && response.responseObject.orderdetoutrec.length &&
			response.responseObject.orderdetoutrec[0].linedetailsrec && response.responseObject.orderdetoutrec[0].linedetailsrec.value &&
			response.responseObject.orderdetoutrec[0].linedetailsrec.value.linedetails && response.responseObject.orderdetoutrec[0].linedetailsrec.value.linedetails.length
		) {
			const lineDetails = response.responseObject.orderdetoutrec[0].linedetailsrec.value.linedetails;
			const item = _.find(lineDetails, { 'lineid': { 'value': lineItemId } });
			if(item.lineid && item.lineid.value === lineItemId && item.deliverydetailsrec && item.deliverydetailsrec.value && item.deliverydetailsrec.value.deliverydetails
				&& item.deliverydetailsrec.value.deliverydetails && item.deliverydetailsrec.value.deliverydetails.length
			) {
				item.deliverydetailsrec.value.deliverydetails.forEach(itm => {
					if(itm.tripdetailsrec && itm.tripdetailsrec.value && itm.tripdetailsrec.value.tripdetails
						&& itm.tripdetailsrec.value.tripdetails.length
					) {
						itm.tripdetailsrec.value.tripdetails.forEach(i => {
							if(i.appointmentdelivery && i.appointmentdelivery.value && dates.indexOf(i.appointmentdelivery.value) === -1) {
								dates.push(i.appointmentdelivery.value);
							}
						});
					}
				});
			}
		}
		return dates;
	}

	isCustomerHasPriceAccess(){
		const self = this;
		const { userDetails} = self.props.state.user;
		let isPricingAccess;
		if(userDetails && userDetails.typeOfUser === 'customer'){
			isPricingAccess = self.props.isResponsibilityExists("Price");
		}
		return isPricingAccess;
	}

	handleExport(event) {
		event.preventDefault();
		
		const self = this;
		self.setState({
			errorMessage: ""
		});
		const payload = [];
		
		self.props.ajaxRequestInitiated();
		let { findGroupOfOrders, whichTypeOfSearch } = this.state;
		let isBookedOrEnteredOrder = false;
		if(findGroupOfOrders && findGroupOfOrders.param && findGroupOfOrders.param.orderType && (findGroupOfOrders.param.orderType === "BOOKED" || findGroupOfOrders.param.orderType === "ENTERED" || findGroupOfOrders.param.orderType === "ALL") && whichTypeOfSearch && whichTypeOfSearch == 'findGroupsOfOrders'){
			isBookedOrEnteredOrder = true;
		}
		const accessibility = typeOfEmployeeAccessLevel.find(itm => itm.typeOfEmployee === self.props.whichTypeOfEmployee());
		const isGEUser = (accessibility && accessibility.accessLevel && accessibility.accessLevel.length > 0 && accessibility.accessLevel.indexOf('Price') !== -1);
		const isAllowPriceInformation = isGEUser || self.isCustomerHasPriceAccess();
		
		//WCP-7808 - fix details

		//Added all the request
		if(isBookedOrEnteredOrder){
			const batchSize = 10; 
			
			const [bookedOrEnteredArray, otherStatusArray] = _.partition(self.state.ordersListResponse.responseObject, item =>
				(item.orderHeader.orderStatus === 'BOOKED' || item.orderHeader.orderStatus === 'ENTERED')
			  );

			if(otherStatusArray && otherStatusArray.length > 0){
				otherStatusArray.map(item => {
					payload.push(this.returnOrderDetailsForExport(self, null, item, isAllowPriceInformation));
				});
			}

			if(bookedOrEnteredArray && bookedOrEnteredArray.length > 0){
				const requests = bookedOrEnteredArray.map(item => {
					const { orderHeader } = item;
					if(orderHeader.orderStatus == "BOOKED" || orderHeader.orderStatus == "ENTERED"){
						return self.addOrderDetailsRequest(`accountNumber=${self.state.accountNumber}&requestType=manageOrders&orderNumber=${orderHeader.orderNumber.trim()}`, self, item, isAllowPriceInformation);
						
					}
				});
				
				//Batching the request based on batch size
				const batches = [];
				if(requests && requests.length > 0){
					for (let i = 0; i < requests.length; i += batchSize) {
						const batch = requests.slice(i, i + batchSize);
						batches.push(batch);
					}
				
					//Executing batch requests
					const promises = batches.map(batch => {
						return Promise.all(batch)
							.then(values => {
								payload.push(...values);
							});
					});
						
					Promise.all(promises)
					.then(() => {
						self.props.ajaxRequestCompleted();
						this.exportExcelData(self, payload, 'accountNumber=' + self.state.accountNumber);
					})
					.catch((error) => {
						self.props.ajaxRequestCompleted();
					});
				}
			}
			else{
				this.exportExcelData(self, payload, 'accountNumber=' + self.state.accountNumber);
			}
		}
		else{
			self.state.ordersListResponse.responseObject.map(item => {
				payload.push(this.returnOrderDetailsForExport(self, null, item, isAllowPriceInformation));
			});
			this.exportExcelData(self, payload, 'accountNumber=' + self.state.accountNumber);
		}
	}
			
	exportExcelData(self,payload, url){
		self.props.exportManageOrdersDetails(payload, url, (response) => {
			self.props.ajaxRequestCompleted();
			if (!response.status) {
			self.setState({
				errorMessage: response.responseMessage
			});
			} else {
				window.open(response.responseObject);
			}
		});
	}

	addOrderDetailsRequest(queryParam, self, item, isAllowPriceInformation) {
		return new Promise((resolve, reject) => {
		  sendRequest(
			bootAPIUrl,
			orders.getOrderListBoot.path,
			'',
			orders.getOrderListBoot.method,
			queryParam
		  )
			.then((response) => {
			  if (!response.status) {
				resolve(this.addOrderDetailsRequest(queryParam, self, item, isAllowPriceInformation));
			  } else {
				resolve(this.returnOrderDetailsForExport(self, response, item, isAllowPriceInformation));
			  }
			})
			.catch((error) => {
			  resolve(this.addOrderDetailsRequest(queryParam, self, item, isAllowPriceInformation));
			});
		});
	}
	
	

	returnOrderDetailsForExport(self,response,item,isAllowPriceInformation){
		const {
			selectedOrderType,
			whichTypeOfSearch,
			findSpecificOrderFilter: {
				param: {
					orderNumber,
					referenceNumber,
					invoiceNumber
				}
			},
		} = self.state;
		const { orderHeader, orderDetail: { orderLine } } = item;
		let orderDetailsdata;
		if(response && response.responseObject && response.responseObject.length > 0){
			orderDetailsdata = response.responseObject[0]
		}
		const items = [];
		let orderShippingDetailsDates = [];

		let { attribute } = orderHeader.attributes;
		let  getOrderShippingDetailsData = {
			responseObject: null
		} 
		const shippingMethod = orderHeader.shipmentMethod.description;

		let enteredBy = '';
		attribute = attribute?_.find(attribute, ['name', 'Attribute2']):null;

		const { bkpOrderShippingDetailsList } = self.state;

		if(bkpOrderShippingDetailsList){
			getOrderShippingDetailsData = {
				responseObject: bkpOrderShippingDetailsList.find(itm => itm.orderdetoutrec && itm.orderdetoutrec.length && itm.orderdetoutrec[0].ordernumber.value.toString() === orderHeader.orderNumber)
			}
		} 


		if(attribute) {
			enteredBy = attribute.value;
		}

		let odrDtl = null;
		if (selectedOrderType === 'BACKORDER' || (self.isValidSearchForMakingGettingOrderShippingDetailsParallelCalls() && orderHeader.orderStatus === 'BOOKED')) {
			odrDtl = self.state.orderShippingDetailsList.find(order => order.orderNumber === orderHeader.orderNumber);
		} else if(self.state.orderDetailsByOrderNumber.length) {
			odrDtl = self.state.orderDetailsByOrderNumber.find(order => order.orderNumber === orderHeader.orderNumber);
			odrDtl = odrDtl && odrDtl.response && odrDtl.response.responseObject ? odrDtl.response.responseObject : null;
		}
		let allLinesAreClosed = item.allLinesAreClosed;
		let allLinesAreClosedOrArrivedAtSDS = item.allLinesAreClosedOrArrivedAtSDS;
		orderLine.forEach(itm => {
			let points ='', totalPoints ='', price = '', extendedPrice='', deliveryAppt = '',invoiceNo ='', invoiceDate='';
			let orderDetailsItem = self.getOrderLineItem(itm, orderDetailsdata);
			if(!(self.props.checkItemIsServiceOrNot(itm.item) === 'service' || itm.lineStatus.toUpperCase() === 'CANCELLED')) {
				let lineStatusFromOrdersList = odrDtl && odrDtl.items && odrDtl.items.length > 0 && odrDtl.items.find(it => it.lineId.toString() === itm.orderLineId.toString()).lineStatusFromOrderListResponse;
				const orderStatus = lineStatusFromOrdersList ? lineStatusFromOrdersList : self.props.getLineStatusFromMapping(itm.item, shippingMethod, itm.lineStatus, itm);
				let suggestedShipDate = '';
				let noSuggestedAssignScheduleShipDateState=false;
				let prdStatus = '';
				const isFromAccountClassificationInExceptionList = self.props.isAccountClassificationInExceptionList();
				if(odrDtl) {
					const itemDetail = odrDtl.items.find(it => it.lineId.toString() === itm.orderLineId.toString());
					if(self.state.selectedOrderType === 'BACKORDER' || (self.isValidSearchForMakingGettingOrderShippingDetailsParallelCalls() && orderHeader.orderStatus === 'BOOKED')) {
						suggestedShipDate = itemDetail && itemDetail.suggestedShipDate ? self.props.pickTheDateFromString(itemDetail.suggestedShipDate, 'MM/DD/YY') : '';
						if(!suggestedShipDate) {
							// For the classifications in this lookup, we should display ONLY the Suggested Ship Date from the shipping service.  If there is no value, we should display no ETA, not "NA".
							if (isFromAccountClassificationInExceptionList) {
								suggestedShipDate = '';
							} else {
								// WCP-7556:
								// If there is no suggested ship date, and the order date is within today -2 days,
								// we should continue to display scheduled ship date.
								if (moment(orderHeader.orderDate).isBetween(moment().add(-2, "days"), moment()) || moment(orderHeader.requestedDeliveryDate) > moment().add(routes.horizon, "days")) {
									noSuggestedAssignScheduleShipDateState = true
									suggestedShipDate = itm.scheduleShipDate && self.props.pickTheDateFromString(itm.scheduleShipDate, 'MM/DD/YY')
								}
							}
						}else{
							noSuggestedAssignScheduleShipDateState = false
							suggestedShipDate = moment(suggestedShipDate).format('MM/DD/YY');										
						}
						prdStatus = itemDetail && itemDetail.productStatus;
					} else {
						if(itm.reserved < itm.orderedQty) {
							suggestedShipDate = itm.suggestedShipDate;
							if (!suggestedShipDate) {
								// For the classifications in this lookup, we should display ONLY the Suggested Ship Date from the shipping service.  If there is no value, we should display no ETA, not "NA".
								if (isFromAccountClassificationInExceptionList) {
									suggestedShipDate = '';
								} else {
									// WCP-7556:
									// If there is no suggested ship date, and the order date is within today -2 days,
									// we should continue to display scheduled ship date.
									if (moment(orderHeader.orderDate).isBetween(moment().add(-2, "days"), moment())) {
										suggestedShipDate = itm.scheduledShipDate;
									}
								}
							}
							suggestedShipDate = suggestedShipDate ? self.props.convertDateToTimeZone(suggestedShipDate).format('MM/DD/YY') : suggestedShipDate;
							prdStatus = itm.productStatus;
						} else if(itm.reserved === itm.orderedQty) {
							suggestedShipDate = '';
							prdStatus = '';
						}
					}
				}
				// WCP-7556 if not orderdate between today - 2 days then check FP logic
				if (itm.finalProductionDate && itm.finalProductionDate !== 'NULL' && !moment(orderHeader.orderDate).isBetween(moment().add(-2, "days"), moment())) {
					// If there is a FP date before today, display FP in the Expected Available Date
					if (moment(itm.finalProductionDate,'YYYYMMDD').isBefore(moment()) || 
						(moment(itm.finalProductionDate,'YYYYMMDD').isAfter(moment()) && 
						!moment(suggestedShipDate).isAfter(moment().add(routes.horizon, "days").hours(0).minutes(0).seconds(0).milliseconds(0)) &&
						suggestedShipDate != 'NULL' )) {
						suggestedShipDate = self.validateFP({finalProductionDate: itm.finalProductionDate, suggestedShipDate});
					} else {
						// else If there is not an FP date before today, display NA in the Expected Available Date
						suggestedShipDate = 'NA'
					}
				}
				// keep existing logic as it is in case not between today - 2 days
				else if (suggestedShipDate && itm.finalProductionDate) {
					suggestedShipDate = self.validateFP({finalProductionDate: itm.finalProductionDate, suggestedShipDate});
				}
				let fullyReservedLine = true;
				if(self.props.getItemTypeByName(itm.item) !== 'S' && itm.reserved !== itm.orderedQty) {
					fullyReservedLine = false;
				}

				let expectedAvailableDate = self.calculateAttributeValue(orderStatus, allLinesAreClosed, allLinesAreClosedOrArrivedAtSDS, item.planNameAndReservedAllLine, shippingMethod, suggestedShipDate, orderHeader);
				let productStatus = self.calculateAttributeValue(orderStatus, allLinesAreClosed, allLinesAreClosedOrArrivedAtSDS, item.planNameAndReservedAllLine, shippingMethod, prdStatus, orderHeader);
				const reservedQty = self.calculateAttributeValue(orderStatus, allLinesAreClosed, allLinesAreClosedOrArrivedAtSDS, item.planNameAndReservedAllLine, shippingMethod, itm.reserved, orderHeader, true);
				const itemCode = (whichTypeOfSearch === 'findSpecificOrder' &&
						(orderNumber.trim() || referenceNumber.trim() || invoiceNumber.trim())
					)
						? (itm.internalItem || itm.item)
						: (itm.inventoryItem || itm.item);

				if (orderStatus === 'Backorder Available' && fullyReservedLine) {
					expectedAvailableDate = self.getLineDate(itm);
					productStatus = 'Expires';
				}
				expectedAvailableDate =  noSuggestedAssignScheduleShipDateState?suggestedShipDate :self.checkForNADate(expectedAvailableDate, suggestedShipDate, orderStatus, isFromAccountClassificationInExceptionList);
				

				if(isAllowPriceInformation){
					if(itm.itemPrice && itm.itemPrice.salesPrice){
						price =  parseFloat(itm.itemPrice.salesPrice).toFixed(2);
						if(itm.orderedQty){
							let calculatePrice = +itm.itemPrice.salesPrice * +itm.orderedQty;
							extendedPrice = parseFloat(calculatePrice).toFixed(2);
						}
						
					}
				}
				points = self.getPointsValue(itm);
				if(!points || points == ''){
					if(orderDetailsItem){
						points = self.getPointsValue(orderDetailsItem);
						if(points && orderDetailsItem.orderedQty){
							totalPoints = this.roundToThreeDecimalPlaces(+points * +orderDetailsItem.orderedQty);
						}
					}
				}
				else if(points && itm.orderedQty){
					totalPoints = this.roundToThreeDecimalPlaces(+points * +itm.orderedQty);
				}
				
				if(getOrderShippingDetailsData.responseObject){
					orderShippingDetailsDates = self.getDeliveryDateByItem(getOrderShippingDetailsData, itm.orderLineId);
					if(orderShippingDetailsDates && orderShippingDetailsDates.length > 0){
						deliveryAppt = orderShippingDetailsDates.join(', ');
					}
				}

				if(itm.invoices && itm.invoices.invoice && itm.invoices.invoice.length > 0){
					let invoice = itm.invoices.invoice[0];
					invoiceNo = invoice.invoiceNumber;
					invoiceDate = invoice.invoiceDate;
					if(!(invoiceNo || invoiceDate) && (orderDetailsItem && orderDetailsItem.invoices && orderDetailsItem.invoices.invoice && orderDetailsItem.invoices.invoice.length > 0)){
						let invoice = orderDetailsItem.invoices.invoice[0];
						invoiceNo = invoice.invoiceNumber;
						invoiceDate = invoice.invoiceDate;
					}
				}
				else if(orderDetailsItem && orderDetailsItem.invoices && orderDetailsItem.invoices.invoice && orderDetailsItem.invoices.invoice.length > 0){
					let invoice = orderDetailsItem.invoices.invoice[0];
					invoiceNo = invoice.invoiceNumber;
					invoiceDate = invoice.invoiceDate;
				}
			

				items.push({
					price: price,
					extendedPrice: extendedPrice,
					invoiceNumber: invoiceNo,
					invoiceDate: self.props.pickTheDateFromString(invoiceDate),
					deliveryApponitment: deliveryAppt,
					lineNo: itm.lineNum,
					pointValue: points,
					totalPoints: totalPoints,
					poNumber: itm.lineCustomerPONumber,
					targetArrivalDate: moment(itm.scheduleArrivalDate).format('MM/DD/YY'),
					agreementNumber: itm.lineSANumber,
					item: itemCode,
					quantity: itm.orderedQty || 0,
					lineStatus: orderStatus,
					expectedAvailableDate,
					productStatus,
					reservedQty,
					agreementName: self.props.getAttributeBySalesAgreement(itm.lineSANumber, 'AGREEMENT_NAME')
				});
			}
		});
		const shipToValue = orderHeader.parties.party.filter((party)=>party.purpose === "SHIP_TO")||[];
		const addressValue = shipToValue[0].party.partySites.site[0].siteLocation.address || null;
		const locationValue = shipToValue[0].party.partySites.site[0].siteLocation.locationId || null;
		let address1 = "";
		let address2 = "";
		let address3 = "";
		let postalCode = "";
		if(addressValue){
			const {address1:add1, address2:add2, address3:add3, postalCode:pcode} = addressValue||{};
			address1 = add1;
			address2 = add2;
			address3 = add3;
			postalCode = pcode;
		}
		else if(isNaN(locationValue)){
			let splitedValue = locationValue.split("|");
			address1 = splitedValue[0];
			address2 = splitedValue[1];
			address3 = splitedValue[2];
			postalCode = (splitedValue.length >= 4 && splitedValue[5]) ?  splitedValue[5] : null;
		}

			

		const job = orderHeader.attributes.attribute[18].value || "";
		return{
			orderDate: self.props.pickTheDateFromString(orderHeader.orderDate),
			orderStatus: orderHeader.orderStatus,
			orderNumber: orderHeader.orderNumber,
			poNumber: orderHeader.ponumber,
			deliveryMethod: shippingMethod,
			requestedDeliveryDate: self.props.pickTheDateFromString(orderHeader.requestedDeliveryDate),
			createdBy: enteredBy,
			warehouseCode: orderHeader.warehouse && orderHeader.warehouse.warehouseCode,
			address1: address1,
			address2:address2,
			lot:address3,
			postalCode:postalCode,
			job:job,
			items,
		};
	}

	getPointsValue(itm){
		if(itm.attributes && itm.attributes.attribute && itm.attributes.attribute.length > 0 ){
			const attribute7Obj = _.find(itm.attributes.attribute, { name: 'Attribute7' });
			return (attribute7Obj && attribute7Obj.value) ? attribute7Obj.value : '';
		}
	}

	roundToThreeDecimalPlaces(number) {
		if (Number.isFinite(number)) {
		  const rounded = Number(number.toFixed(3));
		  return rounded.toString();
		} else {
		  return number.toString();
		}
	  }

	getOrderLineItem(itm, paylaod){
		if(paylaod){
			const { orderDetail: { orderLine } } = paylaod;
			return _.find(orderLine, {orderLineId :itm.orderLineId})
		}
	}

	handleEditOrder(orderNumber, index, event) {
		event.preventDefault();
		const self = this;
		self.props.checkIfAnyActiveSoldAddress(() => {
			const { orderDetailsByOrderNumber } = self.state;
			const orderDetails = _.find(orderDetailsByOrderNumber, {orderNumber: orderNumber});
			if(orderDetails) {
				const { response } = orderDetails;
				response.responseObject.items.forEach((item, i) => {
					item.item = item.internalItem;
				});
				response.responseObject.items = response.responseObject.items.filter(item => {
					const itemCode = item.item;
					return !(itemCode.indexOf('1-YR') === 0 || itemCode.indexOf('2-YR') === 0 || itemCode.indexOf('4-YR') === 0);
				});
				self.setState({
					orderDetailsBkp: response.responseObject,
					selectedEditOrderIndex: index,
					isAvailabilityCallCompleted: false,
			        isPricingCallCompleted: false,
			        isPimCallCompleted: false,
					isGetOrgAttributesCallCompleted: false,
					isPriceOrderCallCompleted: false,
					isServicePriceCallCompleted: false,
					availabilityData: false,
			        pricingData: null,
			        pimData: null,
				}, () => {
					const { selectedPriceSource } = self.props.state.user;
					const skuList = [],
						skuListForPim = [],
						servicesSkuList = [],
						oldSkuList = [];
					response.responseObject && response.responseObject.items && response.responseObject.items.forEach((item, index) => {
						if(!item.item) return null;
						if(item.item.length === 4 && item.item.toLowerCase().indexOf("m") === 0) {
							servicesSkuList.push({ sku: item.item });
						} else if(self.props.getItemTypeByName(item.item) !== 'S') {
							oldSkuList.push({ sku: item.item });
							skuList.push({
								itemNumber: item.item,
								qty: item.quantity,
								shipSet: 1,
								identifier: item.lineNo,
								agreementNumber: item.agreementNumber
							});
						}
						skuListForPim.push(item.item);
					});
					let disableShipToAddressDropdown = false;
					// availability call
					const orderAccountNumber = response.responseObject.shippingAddress && response.responseObject.shippingAddress.shipToAccountNumber;
					if (orderAccountNumber && self.props.getSelectedAccountNumber() !== orderAccountNumber) {
						disableShipToAddressDropdown = true;
						self.props.getAddressListCombinedDataByAccountNumber(orderAccountNumber, (responseObj) => {
								self.makeAvailabilityCalls(oldSkuList, skuList, responseObj.postalCode, responseObj.state, responseObj.siteUseId);
						});
					} else {
						const addressList = _.filter(self.props.getCombinedAddresses(), {PURPOSE: "SHIP_TO"});;
						const shipAdd = response.responseObject.shippingAddress;
						const data = addressList.find(itm => itm.ADDRESS1 === shipAdd.address1 && itm.CITY === shipAdd.city && itm.STATE === shipAdd.state && itm.POSTALCODE === shipAdd.zip);
						const zipCode = data ? data.POSTALCODE.split('-')[0] : '';
						const state = data ? data.STATE : '';
						if (!state) {
							disableShipToAddressDropdown = true;
							self.props.getAddressListCombinedDataByAccountNumber(self.props.getSelectedAccountNumber(), (responseObj) => {
								self.makeAvailabilityCalls(oldSkuList, skuList, responseObj.postalCode, responseObj.state, responseObj.siteUseId);
							});
						} else {
							self.makeAvailabilityCalls(oldSkuList, skuList, zipCode, state, data.SITEID);
						}
					}
					
					// make services price call
					self.fetchServicesPrices(servicesSkuList);

					if(selectedPriceSource.SHIPPING_METHOD) {
						self.props.getShippingMethod(`shippingMethodCode=${selectedPriceSource.SHIPPING_METHOD}`, response => {
							if(!response.status) {
								self.setState({
									errorMessage: response.responseMessage
								});
							} else {
								self.setState({
									isShippingMethodCompleted: true
								}, () => {
									self.callBackBeforeRedirectingToEditOrder();
								})
							}
						});
					} else {
						self.setState({
							isShippingMethodCompleted: true
						}, () => {
							self.callBackBeforeRedirectingToEditOrder();
						})
					}

					// In case of edit order only make below service call
					self.setState({
						last30DaysOrders: [],
						isLast30DaysOrdersCompleted: true,
						last60DaysOrders: [],
						isLast60DaysOrdersCompleted: true,
						disableShipToAddressDropdown
					}, () => {
						self.callBackBeforeRedirectingToEditOrder();
					});

					self.props.getBillingReferences(`requestType=getBillingReferences&accountNumber=${self.props.getSelectedAccountNumber()}`, response => {
						// self.props.getBillingReferences(`requestType=getBillingReferences&accountNumber=3589106`, (response) => {
						let responseObj = response.responseObject;
						if(response.status && responseObj && responseObj.length > 0) {
							responseObj.forEach(item => {
								item.requiredFlag = item.required;
								delete item.required;
							});
						}
						self.setState({
							isBillingPreferencesCallCompleted: true
						}, () => {
							self.props.saveBillingReferences(response);
							self.callBackBeforeRedirectingToEditOrder();
						});
					}, false);

					self.props.getItemTypeByOrderDetails(response.responseObject, resp => {
						if(!resp.status) {
							self.setState({
								errorMessage: resp.responseMessage
							})
						} else {
							const orderDetails = resp.orderDetails;
							const pimData = resp.pimData;
							const productsList = orderDetails && orderDetails.items && orderDetails.items.map(item => ({
								...item,
								productName: item.item,
								agreementNumber: item.agreementNumber,
								qty: item.quantity,
								uncrateInd: item.uncrateInd,
							}));
							self.setState({
								createOrderPayload: orderDetails,
								products: productsList,
								pimData: pimData,
								orderDetailsWithItemType: orderDetails,
								isPimCallCompleted: true,
							}, () => {
								self.callBackAfterParallelCalls();
								// get org attributes details
								self.props.getOrgAttributesByAttributeName("Top Load Indicator", resp => {
									const responseObject = self.state.pimData;
									// update products in state with uncrateInd to use it later for priceOrder service
									let finalProducts = [];
									const { products } = self.state;
									products && products.forEach(item => {
										if(!item.productName) return null;
										let uncrateInd = "N";
										const pimItemData = _.find(responseObject, { item_number: item.productName });
										if(pimItemData && pimItemData.geego_uncrateind) {
											let geego_uncrateind = pimItemData.geego_uncrateind;
											const { selectedAccountsAllPriceSources } = self.props.state.user;
											const record  = selectedAccountsAllPriceSources && _.find(selectedAccountsAllPriceSources.responseObject, {AGREEMENT_NUMBER: selectedPriceSource.AGREEMENT_NUMBER});
											if(record) {
												uncrateInd = record[geego_uncrateind] === "Y"?"Y":"N";
											}
										}
										finalProducts.push({
											...item,
											uncrateInd
										});
									});
									self.setState({
										// pimData: responseObject,
										products: finalProducts,
										isGetOrgAttributesCallCompleted: true
									}, () => {
										self.callBackBeforeRedirectingToEditOrder();
									});
								});
								// Make pricing parallel service call
								self.props.makeParallelCallsForCartPrices(
									self.state.products,
									true,
									true,
									'order',
									null,
									() => {
										const { prices } = self.props.state.order;
										if(prices && prices.length > 0) {
											// Calculate totalcost
											let products = [];
											self.state.products.forEach((item, index) => {
												if(!item.productName) return null;
												let price = 0;
												price = _.find(prices, { item_number: (item.originalItem || item.productName) });
												if(price && price.records && price.records.length > 0) {
													price = price.records[0].adjusted_unit_price || price.records[0].unit_price;
													item.price = price;
													products.push(item);
												} else {
													price = 0;
												}
												return null
											});
											self.setState({
												products,
												isPricingCallCompleted: true
											}, () => {
												self.callBackAfterParallelCalls();
											});
										} else {
											browserHistory.push("/error");
										}
									}
								);
							});
						}
					});
				});
			}
		});
	}

	makeAvailabilityCalls(oldSkuList, skuList, zipCode, state, siteUseId, ) {
		const self = this;
		zipCode && self.props.getShippingAddressesDetails(zipCode, true, 'adc_loc', resp => {
			if(resp && resp.agentid) {
				// new availability call
				const payload = {
					accountNumber: self.props.getSelectedAccountNumber(),
					warehouseCode: resp.agentid,
					customerSiteId: siteUseId,
					items: skuList,
					zipCode: zipCode
				};
				self.props.checkAvailabilityForOrder(payload, response => {
					self.setState({
						newAvailabilityFailed: response.length === 0
					}, () => {
						if(self.state.newAvailabilityFailed) {
							self.props.checkAvailabilityGeneric(oldSkuList, `accountNumber=${self.props.getSelectedAccountNumber()}&zipCode=${self.props.getZipCode()}&legacyCustCode=${self.props.getLegacyCustCode()}&warehouseCode=${resp.agentid}${this.props.getSalesAgreementParamForAvailability()}`, '', true, response => {
								self.setState({
									isAvailabilityCallCompleted: true,
									availabilityData: response.responseObject
								}, () => {
									self.callBackBeforeRedirectingToEditOrder();
								});
							});
						} else {
							self.setState({
								isAvailabilityCallCompleted: true,
								availabilityData: response
							}, () => {
								self.callBackBeforeRedirectingToEditOrder();
							});
						}
					});
				});
			} else {
				self.setState({
					isAvailabilityCallCompleted: true,
				}, () => {
					self.callBackBeforeRedirectingToEditOrder();
				});
			}
		}, true, state);
	}

	fetchServicesPrices(servicesSkuList) {
		const self = this;
		if(servicesSkuList.length > 0) {
			const servicesPayload = [];
			const { selectedAccount, selectedPriceSource } = self.props.state.user;
			// fetch site id from SOLD_TO to address
			const soldToAddresses = self.props.getAddressesByCategory('SOLD_TO');
			let state = 'NA';
			let whse = 'NA';
			let zone = 'NA';
			if (soldToAddresses.length > 0) {
				state = soldToAddresses[0].STATE;
			}
			const pricingEffectiveDate = self.props.convertDateToTimeZone().format('YYYYMMDD');
			self.props.getShippingAddressesDetails(self.getShippingAddressZipCode(), false, 'sds_loc', resp => {
				if (resp) {
					whse = resp.agentid;
					zone = resp.sdsApZone;
					const { salesAgreementNumber, accountNumber } = self.props.checkForTokenAccountByMasterSA(selectedPriceSource, selectedAccount.ACCOUNTNUMBER);
					servicesSkuList.map((item, index) => {
						return servicesPayload.push({
							pricingEffectiveDate: pricingEffectiveDate,
							accountNumber,
							state: self.getShippingAddressState() || state,
							zone: zone,
							whse: whse,
							salesAgreementNumber,
							itemNumber: item.sku
						});
					});
					self.props.checkServicePrices({ items: servicesPayload }, `requestType=servicesPricing`, response => {
						// TO DO : Temporary conversion from json string to json
						response.responseObject = JSON.parse(response.responseObject);
						self.setState({
							servicePricingData: response,
							isServicePriceCallCompleted: true,
						}, () => {
							self.callBackBeforeRedirectingToEditOrder();
						});
					});
				}
			});
		} else {
			self.setState({
				isServicePriceCallCompleted: true,
			}, () => {
				self.callBackBeforeRedirectingToEditOrder();
			});
		}
	}

	callBackAfterParallelCalls() {
		const self = this;
		const {
			isPricingCallCompleted,
			isPimCallCompleted
		} = self.state;
		if(isPricingCallCompleted && isPimCallCompleted) {
			const { selectedAccount } = self.props.state.user;
			// make service call to get warehouseCode and then make pricing service call
			const accountNumber = selectedAccount.ACCOUNTNUMBER;
			const zipCode = self.state.orderDetailsBkp.shippingAddress.zip.split("-")[0];
			const orderState = self.state.orderDetailsBkp.shippingAddress.state;
			zipCode && self.props.getShippingAddressesDetails(zipCode, false, 'sds_loc', resp => {
				if (resp && resp.agentid) {
					let payload = {
						accountNumber: accountNumber,
						warehouseCode: resp.agentid,
						shipmentMethod: resp.isThisADCLOC ? "ADC Truckload" : "SDS Delivery",
						shipToState: self.props.getShipToState(),
						orderTotal: 0,
						priceItems: []
					};
					self.state.products.forEach(itm => {
						if(!itm.productName) return null;
						payload.priceItems.push({
							itemNumber: itm.originalItem || itm.productName,
							qty: itm.qty,
							agreementNumber: itm.agreementNumber && itm.agreementNumber.split(" - ")[0],
							uncrateInd: itm.uncrateInd,
							grossPointValue: itm.pointValue ? itm.pointValue : 0,
						});
						payload.orderTotal += itm.price * itm.qty;
					});
					if(payload.priceItems.length === 0) {
						let { ordersListResponse, selectedEditOrderIndex } = self.state;
						ordersListResponse.responseObject[selectedEditOrderIndex].priceServiceDownErrorMessage = "Items not priced in the selected Sales Agreement";
						self.setState({
							ordersListResponse
						});
					} else {
						// make pricing service call
						self.props.getPriceOrder(payload, "requestType=priceOrder", response => {
							self.setState({
								isPriceOrderCallCompleted: true,
								pricingData: response.responseObject
							}, () => {
								self.callBackBeforeRedirectingToEditOrder();
							});
						});
					}
				} else {
					self.setState({
						isPriceOrderCallCompleted: true
					}, () => {
						self.callBackBeforeRedirectingToEditOrder();
					});
				}
			},true, orderState);
		}
	}

	getAttributeByLineId(lineId, attributeName) {
		return _.find(this.state.orderDetailsBkp.items, {lineId})[attributeName];
	}

	handleContinueEditOrder(attributeName) {
		const self = this;
		const {
			availabilityData,
			pimData,
			pricingData,
			servicePricingData,
			orderDetailsWithItemType,
		} = this.state;
		let items = [];
		self.state.products.forEach((item, index) => {
			let availability = !self.state.newAvailabilityFailed && availabilityData.find(itm => itm.itemNumber === item.productName && itm.identifier === parseInt(item.lineNo, 10));
			if(!availability) {
				const data = availabilityData.find(itm => itm.sku === item.item);
				if(data) {
					availability = {
						requestedDateQuantity: data.availableQty,
						requestedDeliveryDate: '',
						groupShipDate: '',
						groupShipDateBkp: '',
						shipDate: '',
					};
				}
			}
			let salesPriceData = pricingData ? _.find(pricingData, itm => {
				return itm.itemPrice.item === (item.originalItem || item.productName) && itm.itemPrice.lineIndex === (index + 1).toString() && item.qty.toString() === itm.itemPrice.qty.toString()
			}) : null;
			// If its not available from priceOrder service response then use it from search result pricing service
			// Its already getting saved in .price of products object
			if(!salesPriceData && item.price) {
				salesPriceData = {
					itemPrice: {
						salesPrice: item.price
					}
				}
			}
			const pimItemData = _.find(pimData, { item_number: item.productName });
			let isAttribute10 = false;
			let orderNumber = '';
			if(item.attribute10) {
				isAttribute10 = true;
				const attribute10 = item.attribute10.split("-");
				orderNumber = attribute10[0];
				const backOrders = self.props.state.order.backOrders && self.props.state.order.backOrders.responseObject ? self.props.state.order.backOrders.responseObject : [];
				const lineNum = attribute10[1].split(".")[0];
				if(orderNumber && lineNum && backOrders.length) {
					const currentOrderDetail = backOrders.find(itm => itm.orderHeader.orderNumber === orderNumber);
					const lineDetail = currentOrderDetail && currentOrderDetail.orderDetail.orderLine.find(itm => itm.lineNum === lineNum);
					if(lineDetail && lineDetail.lineStatus.toUpperCase() === 'CANCELLED') {
						isAttribute10 = false;
					}
				}
			}
			if (availability && salesPriceData && pimItemData) {
				const hasReplacement = pimItemData && pimItemData.relationship_type && pimItemData.relationship_type.indexOf("Superseded") !== -1?true:false;
				const replacementSKUs = hasReplacement ? self.getIndexes(pimItemData.relationship_type, pimItemData.related_item_number, "Superseded") : [];
				const hasSubstitute = pimItemData.relationship_type && pimItemData.relationship_type.indexOf("Substitute") !== -1?true:false;
				const substituteSKUs = hasSubstitute ? self.getIndexes(pimItemData.relationship_type, pimItemData.related_item_number, "Substitute") : [];
				const hasUpgrade = pimItemData.relationship_type && pimItemData.relationship_type.indexOf("Up-Sell") !== -1?true:false;
				const upgradeSKUs = hasUpgrade ? self.getIndexes(pimItemData.relationship_type, pimItemData.related_item_number, "Up-Sell") : [];
				const isFedexable = pimItemData.geego_fedexable === "Y" ? true : false;
				// const product = _.find(self.state.product, {item: item.item});
				let newItem = {
					...item,
					lineNo: self.getAttributeByLineId(item.lineId, 'lineNo'),
					lineId: item.lineId,
					item: item.productName,
					originalItem: item.originalItem,
					itemDescription: item.itemDescription,
					itemType: item.itemType,
					originalQuantity: item.qty,
					quantity: item.qty,
					quantityError: '',
					availability: availability.requestedDateQuantity ? parseInt(availability.requestedDateQuantity, 10) : availability.requestedDateQuantity,
					eta: self.props.pickTheDateFromString(availability.shipDate),
					groupShipDate: self.props.pickTheDateFromString(availability.groupShipDate),
					groupShipDateBkp: self.props.pickTheDateFromString(availability.groupShipDate),
					shipDate: self.props.pickTheDateFromString(availability.shipDate),
					availabilityBkp: availability.requestedDateQuantity,
					etaBkp: self.props.pickTheDateFromString(availability.requestedDeliveryDate),
					price: salesPriceData.itemPrice.salesPrice,
					agreementNumber: item.agreementNumber,
					originalAgreementNumber: item.agreementNumber,
					poNumber: self.getAttributeByLineId(item.lineId, 'poNumber'),
					relatedServices: self.props.prepareBagItems(salesPriceData),
					// this can be used to calculate orderTotal without making pricing service call again before orderPrice service
					originalPrice: item.price,
					pointValue: pimItemData[attributeName] && pimItemData[attributeName] !== 'NULL' ? parseFloat(pimItemData[attributeName] * item.qty) : 0.00,
					perItemPointValue: pimItemData[attributeName] && pimItemData[attributeName] !== 'NULL' ? parseFloat(pimItemData[attributeName]) : 0.00,

					// Top load indicator value for backup
					perItemPointValueTopLoad: pimItemData['geego_top_load'] && pimItemData['geego_top_load'] !== 'NULL' ? parseFloat(pimItemData['geego_top_load']) : 0.00,
					// No top load indicator value for backup
					perItemPointValueNoTopLoad: pimItemData['geego_no_top_load'] && pimItemData['geego_no_top_load'] !== 'NULL' ? parseFloat(pimItemData['geego_no_top_load']) : 0.00,
					brand: pimItemData['geego_brand'],
					category: pimItemData['item_catalog_group'],

					geego_final_production_date: pimItemData['geego_final_production_date'],
					geego_distribution_start_date: pimItemData['geego_distribution_start_date'],
					geego_uncrateind: pimItemData.geego_uncrateind,

					weight: self.props.getOrderWeightFromPimData(pimItemData, item.qty),
					perItemWeight: self.props.getOrderWeightFromPimData(pimItemData, 1),
					hasReplacement,
					hasSubstitute,
					hasUpgrade,
					replacementSKUs,
					substituteSKUs,
					upgradeSKUs,
					isFedexable,
					uncrateInd: item.uncrateInd,
					originalUncrateInd: item.uncrateInd,
					requestedDeliveryDate: 'delivery1',
					originalDelivery: 'delivery1',
					alreadyAdded: true,
					redirectFrom: 'manageorder',
					originalAction: 'update',
					originalOrderNumber: isAttribute10 ? orderNumber : '',
				};
				// pass modifiers from order details data if ordernumber and line number exists
				if (isAttribute10 && orderNumber) {
					newItem = {
						...newItem,
						orderLineId: item.lineId,
						modifiers: self.getAttributeByLineId(item.lineId, 'modifiers'),
						originalItem: self.props.getDataFromParallelCall(item.orderLineId, item.orderNumber, 'originalItem'),
					};
				}
				items.push(newItem);
			} else {
				browserHistory.push("/error");
			}
		});
		if(servicePricingData && servicePricingData.responseObject && servicePricingData.responseObject.items) {
			orderDetailsWithItemType.items.forEach(item => {
				if(item.itemType === 'S') {
					const price = _.find(servicePricingData.responseObject.items, {itemNumber: item.item});
					const pimItemData = _.find(pimData, { item_number: item.item });
					if(price && price.unitPrice && pimItemData) {
						items.push({
							lineNo: self.getAttributeByLineId(item.lineId, 'lineNo'),
							lineId: item.lineId,
							item: item.item,
							itemDescription: item.itemDescription,
							itemType: item.itemType,
							originalQuantity: item.quantity,
							quantity: item.quantity,
							quantityError: '',
							price: price.unitPrice,
							agreementNumber: item.agreementNumber,
							poNumber: self.getAttributeByLineId(item.lineId, 'poNumber'),
							// this can be used to calculate orderTotal without making pricing service call again before orderPrice service
							originalPrice: price.unitPrice,
							pointValue: pimItemData[attributeName] && pimItemData[attributeName] !== 'NULL' ? parseFloat(pimItemData[attributeName] * item.qty) : 0.00,
							perItemPointValue: pimItemData[attributeName] && pimItemData[attributeName] !== 'NULL' ? parseFloat(pimItemData[attributeName]) : 0.00,
							geego_cust_acct: pimItemData.geego_cust_acct,
							
							// Top load indicator value for backup
							perItemPointValueTopLoad: pimItemData['geego_top_load'] && pimItemData['geego_top_load'] !== 'NULL' ? parseFloat(pimItemData['geego_top_load']) : 0.00,
							// No top load indicator value for backup
							perItemPointValueNoTopLoad: pimItemData['geego_no_top_load'] && pimItemData['geego_no_top_load'] !== 'NULL' ? parseFloat(pimItemData['geego_no_top_load']) : 0.00,
							brand: pimItemData['geego_brand'],
							category: pimItemData['item_catalog_group'],
							weight: 0.00,
							perItemWeight: 0.00,
							hasReplacement: false,
							hasSubstitute: false,
							hasUpgrade: false,
							replacementSKUs: false,
							substituteSKUs: false,
							upgradeSKUs: false,
							isFedexable: false,
							uncrateInd: item.uncrateInd,
							requestedDeliveryDate: 'delivery1',
							originalDelivery: 'delivery1',
							alreadyAdded: true,
							redirectFrom: 'manageorder'
						});
					}
				}
			});
			items = _.orderBy(items, ['lineNo'], ['asc'])
		}
		if(items.length === 0) {
			let { ordersListResponse, selectedEditOrderIndex } = self.state;
			ordersListResponse.responseObject[selectedEditOrderIndex].priceServiceDownErrorMessage = "Error occured while fetching pricing";
			self.setState({
				ordersListResponse
			});
		} else {
			self.props.saveCreateOrderPayload({
				...self.props.state.order.orderDetails.responseObject,
				items: items,
				alternateADC: (self.props.state.order.orderDetails.responseObject.deliveryMethod === 'ADC Truckload' || self.props.state.order.orderDetails.responseObject.deliveryMethod === 'ADC LTL') ? self.props.state.order.orderDetails.responseObject.warehouseCode : '',
				oldWarehouseCode: self.props.state.order.orderDetails.responseObject.warehouseCode,
				oldDeliveryMethod: self.props.state.order.orderDetails.responseObject.deliveryMethod,
				disableShipToAddressDropdown: self.state.disableShipToAddressDropdown,
			});
			// Reset orders before redirecting to edit order page
			self.props.saveDeletedItems([]);
			//Save manage order list into store
			self.props.saveManageOrdersListBackup(JSON.parse(JSON.stringify(self.state)));
			browserHistory.push("/order/editOrder");
		}
	}

	callBackBeforeRedirectingToEditOrder() {
		const self = this;
		const {
			isAvailabilityCallCompleted,
			isPricingCallCompleted,
			isGetOrgAttributesCallCompleted,
			isPimCallCompleted,
			isServicePriceCallCompleted,
			isPriceOrderCallCompleted,
			isShippingMethodCompleted,
			isLast30DaysOrdersCompleted,
			isLast60DaysOrdersCompleted,
			last30DaysOrders,
			last60DaysOrders,
			isBillingPreferencesCallCompleted,
		} = this.state;
		if (isShippingMethodCompleted &&
			isServicePriceCallCompleted &&
			isPriceOrderCallCompleted &&
			isGetOrgAttributesCallCompleted &&
			isAvailabilityCallCompleted &&
			isPricingCallCompleted &&
			isPimCallCompleted &&
			isLast30DaysOrdersCompleted &&
			isLast60DaysOrdersCompleted &&
			isBillingPreferencesCallCompleted
		) {
			self.props.saveBookedOrders(last30DaysOrders.concat(last60DaysOrders));
			let attributeName = "geego_top_load";
			self.props.getOrgAttributesByAttributeName("Top Load Indicator", resp => {
				if(!resp) {
					attributeName = "geego_no_top_load";
				}
				if(self.state.products.find(item => item.attribute10)) {
					// reset backorders from store so it will make call again;
					self.props.saveBackOrders(null);
					self.props.checkForBackOrders(self.props.getSelectedAccountNumber(), true, () => {
						self.handleContinueEditOrder(attributeName);
					});
				} else {
					self.handleContinueEditOrder(attributeName);
				}
			});
		}
    }

	prepareHoldList(orderHeader, orderLine) {
		const self = this;
		let holdNameList = [];
		if(orderHeader && orderHeader.holds && orderHeader.holds.hold && orderHeader.holds.hold.length) {
			orderHeader.holds.hold.forEach((item, index) => {
				holdNameList.push(item.holdName);
			});
		}
		orderLine.forEach((itm) => {
			if(!(self.props.checkItemIsServiceOrNot(itm.item) === 'service' || itm.lineStatus.toUpperCase() === 'CANCELLED')) {
				if(itm.holds && itm.holds.hold && itm.holds.hold.length) {
					itm.holds.hold.forEach((item, index) => {
						if (holdNameList.indexOf(item.holdName) === -1) {
							holdNameList.push(item.holdName);
						}
					});
				}
			}
		});
		// exclude some holds
		const excludeHolds = ['Backorder Hold', 'Reservation Transfer Line'];
		holdNameList = holdNameList.filter(item => excludeHolds.indexOf(item) === -1);
		return holdNameList;
	}

	findSuggestedShipDate(itemDetail, suggestedShipDate) {
		const self = this;
	    if(itemDetail) {
	        if(itemDetail.suggestedShipDate) {
				const date = self.props.pickTheDateFromString(itemDetail.suggestedShipDate, 'YYYY/MM/DD');
	            suggestedShipDate = suggestedShipDate === '' || self.props.convertDateToTimeZone(suggestedShipDate).isBefore(date) ? date : suggestedShipDate;
	        } else if(itemDetail.scheduledShipDate) {
				const date = self.props.pickTheDateFromString(itemDetail.scheduledShipDate, 'YYYY/MM/DD');
	            suggestedShipDate = suggestedShipDate === '' || self.props.convertDateToTimeZone(suggestedShipDate).isBefore(date) ? date : suggestedShipDate;
	        }
	    }
	    return suggestedShipDate;
	}

	getExpectedShipDate(anyItemIsBackOrderHold, fullyReservedOrder, allLinesAreClosed, allLinesAreClosedOrArrivedAtSDS, shippingMethod, eta, planNameAndReservedAllLine, selectedOrderType, anyItemHavingPlanName, item) {
		// In case of back order below line will calculate expected ship date and return
		//let expectedShipDate = anyItemIsBackOrderHold ? '' : <p><strong>Expected Ship Date</strong>: {fullyReservedOrder ? 'Fully Reserved' : eta}</p>;
		//let expectedShipDate = anyItemIsBackOrderHold ? '' : <p><strong>Awaiting Reservations</strong></p>;
		let expectedShipDate = anyItemIsBackOrderHold ? '' : <p><strong>{fullyReservedOrder ? 'Fully Reserved' : 'Awaiting Reservations'}</strong></p>;
		if(selectedOrderType !== 'BACKORDER') {
			const cancelledItems = item.orderDetail.orderLine.filter(itm => itm.lineStatus.toUpperCase() === 'CANCELLED');
			if(cancelledItems.length === item.orderDetail.orderLine.length) {
				expectedShipDate = <p><strong>Cancelled</strong></p>;
			} else if(shippingMethod === 'ADC Will Call') {
				if(allLinesAreClosed) {
					expectedShipDate = <p><strong>Shipped</strong></p>;
				} else if(fullyReservedOrder && anyItemHavingPlanName) {
					expectedShipDate = <p><strong>Ready for Pickup</strong></p>;
				} else if(fullyReservedOrder && !anyItemHavingPlanName) {
					expectedShipDate = <p><strong>Fully Reserved</strong></p>;
				}
			} else if(shippingMethod.indexOf('SDS') === 0 || shippingMethod === 'Home Delivery') {
				if(allLinesAreClosed) {
					expectedShipDate = <p><strong>Delivered</strong></p>;
				} else if(allLinesAreClosedOrArrivedAtSDS) {
					expectedShipDate = <p><strong>Arrived at SDS</strong></p>;
				}  else if(planNameAndReservedAllLine) {
					expectedShipDate = <p><strong>Shipment Planned</strong></p>;
				}
			} else if(shippingMethod === 'ADC Truckload' || shippingMethod === 'ADC LTL' || shippingMethod === 'Meet Truck') {
				if(allLinesAreClosed) {
					expectedShipDate = <p><strong>Shipped</strong></p>;
				} else if(fullyReservedOrder && anyItemHavingPlanName) {
					expectedShipDate = <p><strong>Shipment Planned</strong></p>;
				} else if(fullyReservedOrder && !anyItemHavingPlanName) {
					expectedShipDate = <p><strong>Fully Reserved</strong></p>;
				}
			}
		}
		return expectedShipDate;
	}

	validateFP(item) {
		const self = this;
		let finalProductionDate = null;
		if(item.finalProductionDate && item.finalProductionDate !== 'NULL') {
			finalProductionDate = item.finalProductionDate;
		}
		return self.props.checkIfFPForManageOrder({
			finalProductionDate,
			suggestedShipDate: item.suggestedShipDate
		});
	}

	updateFilterParam(event) {
		const self = this;
		self.setState({
			filter: {
				...self.state.filter,
				[event.target.name]: event.target.checked
			}
		});
	}

	applyFilterParam(callback) {
		const self = this;
		let { filter, whichTypeOfSearch } = self.state;
		// TO DO: Apply filter update logic
		let ordersListResponse = self.state.backupOrdersListResponse && JSON.parse(JSON.stringify(self.state.backupOrdersListResponse.responseObject));
		if((whichTypeOfSearch === 'findGroupsOfOrders' || whichTypeOfSearch === 'findAllBackOrdersOrder') && ordersListResponse && ordersListResponse.length) {
			if (filter.shipToAddress) {
				ordersListResponse = ordersListResponse.filter(item => self.props.isOrderAddressSameAsHeader(item.orderHeader));
			}
			if (filter.salesAgreement) {
				ordersListResponse.forEach(item => {
					item.orderDetail.orderLine = self.props.filterLinesBySalesAgreementSameAsHeader(item.orderDetail.orderLine);
				});
				ordersListResponse = ordersListResponse.filter(item => item.orderDetail.orderLine.length > 0);
			}
			if (self.props.isGEAPartsSalesAgreementSelected() && filter.backorder) {
				ordersListResponse.forEach(item => {
					item.orderDetail.orderLine = item.orderDetail.orderLine.filter(orderLineItem => orderLineItem.scheduleShipDate && moment(orderLineItem.scheduleShipDate).diff(moment(), 'days') > 25);
				})
				ordersListResponse = ordersListResponse.filter(item => item.orderDetail.orderLine.length > 0);
			}
		}
		self.setState({
			ordersListResponse: {
				...self.state.ordersListResponse,
				...self.state.backupOrdersListResponse,
				responseObject: ordersListResponse
			},
		}, () => {
			callback && callback();
		});
	}

	handleChangeFromDate(date) {
	  	const self = this;
		const minToDate = date ? date : null;
		let toDateMomentObj = self.state.toDate;
		let { toDate } = self.state.findGroupOfOrders.param;
		if (date && date.isAfter(toDateMomentObj)) {
			toDateMomentObj = null;
			toDate = '';
		}
	  	self.setState({
		  	fromDate: date ? date.hours(0).minutes(0).seconds(0).milliseconds(0) : date,
			toDate: toDateMomentObj,
			minToDate,
			invalidDateSelectionErrorMessage: '',
			findGroupOfOrders: {
				...self.state.findGroupOfOrders,
				param: {
					...self.state.findGroupOfOrders.param,
			  		fromDate: date && date.format('MM/DD/YYYY'),
					toDate,
				},
				error: {
					...self.state.findGroupOfOrders.error,
					fromDateError: ""
				}
		  	}
	  	});
	}

	handleChangeToDate(date) {
	  	const self = this;
	  	self.setState({
		  	toDate: date ? date.hours(0).minutes(0).seconds(0).milliseconds(0) : date,
			invalidDateSelectionErrorMessage: '',
			findGroupOfOrders: {
				...self.state.findGroupOfOrders,
				param: {
					...self.state.findGroupOfOrders.param,
			  		toDate: date && date.format('MM/DD/YYYY')
				},
				error: {
					...self.state.findGroupOfOrders.error,
					toDateError: ""
				}
		  	}
	  	});
	}

	manipulateClipBoardOfPONumber(event) {
		this.props.manipulateClipBoardOfPONumber((e) => {
			this.updateParams('findSpecificOrderFilter', e);
		}, undefined, undefined, event);
	}

	getLineDate(lineDetails) {
		let lineDate = null;
		lineDetails.backOrdNotifications.backOrdNotification.forEach(notification => {
			if (lineDate === null || moment(lineDate).isAfter(moment(notification.notificationDate))) {
				lineDate = notification.notificationDate;
			}
		});
		if(lineDate) {
			lineDate = moment(lineDate, "YYYY-MM-DD h:mm:ss a").add(7, "days").format("MM/DD/YYYY");
		}
		return lineDate;
	}

	handleChangeRequestedDeliveryDate(index, orderHeader, fullyReservedOrder, displayedItemDetails, event) {
		event.preventDefault();
		const self = this,
			{ orderDetailsByOrderNumber } = self.state;
		let orderDetail = _.find(orderDetailsByOrderNumber, {orderNumber: orderHeader.orderNumber}).response.responseObject;
		orderDetail = JSON.parse(JSON.stringify(orderDetail));
		// filtered item which we are displaying on screen
		orderDetail.items = orderDetail.items.filter(item => displayedItemDetails.find(itm => itm.orderLineId === item.lineId));
		orderDetail.items.forEach(item => {
			item.reservedQty = displayedItemDetails.find(itm => itm.orderLineId === item.lineId).reservedQty;
		});
		orderDetail.fullyReservedOrder = fullyReservedOrder ? 'Y' : 'N';
		self.setState({
			selectedIndex: index,
			orderHeader: orderHeader,
			currentOrderDetail: orderDetail,
		}, () => {
			self.handleDialog('ChangeRequestedDeliveryDateOverlayDialog', true);
		});
	}

	hideAllAvailableActions(requestedDeliveryDate) {
		const self = this;
		let { ordersListResponse, selectedIndex, orderDetailsByOrderNumber, orderHeader } = self.state;
		ordersListResponse.responseObject[selectedIndex].viewAvailableActions = true;
		ordersListResponse.responseObject[selectedIndex].orderHeader.requestedDeliveryDate = requestedDeliveryDate;
		orderDetailsByOrderNumber = orderDetailsByOrderNumber.filter(item => item.orderNumber !== orderHeader.orderNumber);
		self.setState({
			selectedIndex: undefined,
			orderHeader: undefined,
			currentOrderDetail: undefined,
			ordersListResponse,
			orderDetailsByOrderNumber
		});
	}

	checkForNADate(expectedAvailableDate, suggestedShipDate, orderLineStatus, isFromAccountClassificationInExceptionList) {
		if (orderLineStatus === 'Entered' || orderLineStatus === 'Closed') {
			return '';
		}
		// Keep FP as it is as per previous calculation of WCP-7556
		if (suggestedShipDate === 'FP' || suggestedShipDate === 'NA') {
			return suggestedShipDate;
		}
		// WCP-7494: in case of no suggested ship date and is account classification in exception list
		// at that time we need to return blank instead of 'NA'
		if (!suggestedShipDate && isFromAccountClassificationInExceptionList) {
			return 'NA';
		}
		if(suggestedShipDate === "12/31/00" || suggestedShipDate === "01/01/01" && isFromAccountClassificationInExceptionList){
			return ""
		}
		// if suggested ship date is after 300 days || no suggested ship date then show NA
		if(!suggestedShipDate){
			return 'NA';
		}
		else if (
			moment(suggestedShipDate).isAfter(moment().add(routes.horizon, "days").hours(0).minutes(0).seconds(0).milliseconds(0))
		) {
			return '6+ mos';
		}
		return expectedAvailableDate;
	}

	getLocTypeAccordingToDeliveryMethod(deliveryMethod) {
		const record = _.find(this.props.state.order.pickAgentId, {deliveryMethod: deliveryMethod});
		return record && record.loctype ? record.loctype : null;
	}

	checkIfStateIsAk(shippingAddress, deliveryMethod) {
		let flag = false;
		if((shippingAddress && shippingAddress.state === 'AK') || deliveryMethod.indexOf('Ocean') !== -1) {
			flag = true;
		}
		return flag;
	}

	handleCreateWorkOrder(orderNumber, itemsList, event) {
		event.preventDefault();
		const self = this;
		const { orderDetailsByOrderNumber } = self.state;
		const orderDetails = _.find(orderDetailsByOrderNumber, {orderNumber: orderNumber}).response.responseObject;
		let services = [];
		this.setState({
			orderDetails
		}, ()=> {
			const { items, shippingAddress, deliveryMethod, accountNumber, agreementNumber } = orderDetails;
			items.forEach((item) => {
				if(self.props.isMService(item.item)) {
					services.push({
						service:item.item,
						serviceDescription:item.itemDescription,
						servicePrice:`${item.price}.00`
					});
				}
			});
			//Changes was done as part of WCP-7814
			let isM010Present = false;
			services.forEach(v => {
				if(v.service === "M010"){
					isM010Present = true;
				}
			});
			if(!isM010Present){
				services.push({
					service: "M010",
				});
			}
			// make service call to get warehouseCode and then make pricing service call
			const zipCode = shippingAddress.zip.split('-')[0];
			self.props.getShippingAddressesDetails(zipCode, false, self.getLocTypeAccordingToDeliveryMethod(deliveryMethod), resp => {
				if(self.checkIfStateIsAk(shippingAddress, deliveryMethod)) {
					resp = {
						agentid: "SEA",
						dockcity: "SEATTLE"
					}
				}
				if(resp && resp.agentid) {
					const servicePricingPayload = {
						pricingEffectiveDate: moment().format('YYYYMMDD'),
						accountNumber,
						state: shippingAddress.state,
						whse: resp.agentid,
						zone: resp.sdsApZone,
						salesAgreementNumber: agreementNumber,
						postalCode: shippingAddress.zip.split("-")[0],
						country: shippingAddress.country ? shippingAddress.country : "US"
					};
					const servicesPayload = services.map(item => {
						return {
							...servicePricingPayload,
							itemNumber: item.service
						};
					});
					self.props.checkServicePrices({items: servicesPayload}, "requestType=servicesPricing", resp => {
						const finalAvailableServices = [];
						if(resp.status) {
							resp.responseObject = JSON.parse(resp.responseObject);
							services.forEach(item => {
								let record = resp.responseObject.items.find((itm) => itm.itemNumber === item.service);
								if(record && (record.unitPrice)) {
									finalAvailableServices.push({
										service: record.itemNumber,
										servicePrice: record.unitPrice,
										serviceDescription: record.description,
									});
								}
							});
						} 
						self.setState({
							availableServices: finalAvailableServices,
							requiredPayloadForServicePricing: servicePricingPayload
						}, () => {
							self.handleDialog("AddServicesForWorkOrderDialog", true, null);
						})
					})
				}
			}, true, shippingAddress.state, accountNumber);
		});
	}

    render() {
		const self = this;
		const {
			whichTypeOfSearch,
			findGroupOfOrders: {
				error: {
					fromDateError,
					toDateError
				}
			},
			findSpecificOrderFilter: {
				param: {
					orderNumber,
					referenceNumber,
					invoiceNumber
				}
			},
			fromDate,
			toDate,
			maxFromDate,
			maxToDate,
			minToDate,
			invalidDateSelectionErrorMessage,
			invalidOrderNumberErrorMsg,
			partsOrderDetailsList
		} = self.state;
		const {workOrderAccountClassification, workOrderShippingMethod } = self.props.state.order;
		const { selectedAccount,selectedAddress } = self.props.state.user;
		const selectedAddressValue = JSON.parse(selectedAddress);
		const customerClassCode = selectedAccount && selectedAccount.CUSTOMERCLASSCODE ? selectedAccount.CUSTOMERCLASSCODE.toLowerCase() : "";
		const showEditOrderButton = this.props.isResponsibilityExists("Edit Orders") && this.props.isResponsibilityExists("Price");
		const isPunchOutAccess = this.props.isPunchOutAccess();
		const isGEAPartsSalesAgreementSelected = this.props.isGEAPartsSalesAgreementSelected();
		return (
			<div>
		        <div>
		          	<h1 className="pageTitle">Manage Orders</h1>
		        </div>
	          	<div className="push">
	            	<div className="filterBoxType2 particularOrderShadedBox">
	              		<div style={{float: 'left', width: '45%', position: 'relative'}}>
	                		<h3 style={{marginBottom: 0, marginTop: 14}}>Search for Groups of Orders</h3>
							<BackOrderFilters classname="backorder-filters manage-order-page" filter={this.state.filter} updateFilterParam={this.updateFilterParam.bind(this)} isPunchOutAccess={isPunchOutAccess} isGEAPartsSalesAgreementSelected={isGEAPartsSalesAgreementSelected} />
							<form onSubmit={this.handleFindGroupsOfOrders.bind(this)}>
								<div className="clearfix">
									{ invalidDateSelectionErrorMessage && <p className="red bold">{invalidDateSelectionErrorMessage}</p>}
									<div className={'pull-left ' + fromDateError}>
										<label htmlFor='fromDate'><strong>From Date</strong></label>
										<DatePicker maxDate={maxFromDate ? self.props.convertDateToTimeZone(maxFromDate).hours(0).minutes(0).seconds(0).milliseconds(0) : maxFromDate} id="fromDate" placeholderText="Click to select a from date" selected={fromDate ? self.props.convertDateToTimeZone(fromDate).hours(0).minutes(0).seconds(0).milliseconds(0) : fromDate} onChange={this.handleChangeFromDate} />&nbsp;<var>(mm/dd/yyyy)</var>
									</div>
									<div className={'pull-right ' + toDateError}>
										<label htmlFor='toDate'><strong>To Date</strong></label>
										<DatePicker minDate={minToDate ? self.props.convertDateToTimeZone(minToDate).hours(0).minutes(0).seconds(0).milliseconds(0) : minToDate} maxDate={maxToDate ? self.props.convertDateToTimeZone(maxToDate).hours(0).minutes(0).seconds(0).milliseconds(0) : maxToDate} id="toDate" placeholderText="Click to select a to date" selected={toDate ? self.props.convertDateToTimeZone(toDate).hours(0).minutes(0).seconds(0).milliseconds(0) : toDate} onChange={this.handleChangeToDate} />&nbsp;<var>(mm/dd/yyyy)</var>
									</div>
								</div>
				                <p>
									<label htmlFor='selectOrderType'><strong>Status</strong></label>
				                  	<select onChange={this.updateParams.bind(this, 'findGroupOfOrders')} value={this.state.findGroupOfOrders.param.orderType} name="orderType" id="selectOrderType" className={"almostFullWidth "+this.state.findGroupOfOrders.error.orderTypeError}>
										<option value="ALL">All Orders</option>
		                                <option value="BOOKED">Booked orders</option>
		                                <option value="ENTERED">Entered Orders</option>
		                                <option value="CLOSED">Closed Orders</option>
				                  	</select>
								</p>
								<p>
				                	<label>
										{isGEAPartsSalesAgreementSelected ? <strong>Item</strong> : <strong>Product #<span className="smalltext">(Optional)</span></strong>}<br />
										<input onChange={this.updateParams.bind(this, 'findGroupOfOrders')} value={this.state.findGroupOfOrders.param.productNumber} className={"almostFullWidth "+this.state.findGroupOfOrders.error.productNumberError} type="text" name="productNumber" placeholder={isGEAPartsSalesAgreementSelected ? 'Partial or Full' : "Partial or Full Product #"} />
				                	</label>
				                </p>
								{!isGEAPartsSalesAgreementSelected && <React.Fragment>
									<p>
										<label>
											<strong>Address Line 1 <span className="smalltext">(Optional)</span></strong><br />
											<input onChange={this.updateParams.bind(this, 'findGroupOfOrders')} value={this.state.findGroupOfOrders.param.addressLine1} className={"almostFullWidth "+this.state.findGroupOfOrders.error.addressLine1Error} type="text" name="addressLine1" placeholder="Partial or Full Address Line 1" />
										</label>
									</p>
									<p>
										<label>
											<strong>Lot #<span className="smalltext">(Optional)</span></strong><br />
											<input onChange={this.updateParams.bind(this, 'findGroupOfOrders')} value={this.state.findGroupOfOrders.param.lot} className={"almostFullWidth "+this.state.findGroupOfOrders.error.lotError} type="text" name="lot" placeholder="Partial or Full Lot #" />
										</label>
									</p>
								</React.Fragment>}
								{isGEAPartsSalesAgreementSelected && <p>
									<label htmlFor="backorder" className="normal"><strong>Backorder</strong></label>&nbsp;
									<input id="backorder" name="backorder" type="checkbox" checked={this.state.filter.backorder} onChange={this.updateFilterParam.bind(this)} />
								</p>}
				                <p>
				                	<input className="blueButton" type="submit" value="Find Orders" />
									&nbsp; &nbsp; &nbsp;<input onClick={this.handleResetForm.bind(this, 'group')} className="looksLikeALink blue" type="reset" value="clear all" />
				                </p>
							</form>
							{!isGEAPartsSalesAgreementSelected && !isPunchOutAccess && <form onSubmit={this.handleFindAllBackOrders.bind(this)}>
								<p>
									<br />
									<input className="blueButton" type="submit" value="Find all Hold Backorders" />
								</p>
							</form>}
	              		</div>
		              	<div style={{float: 'left', width: '9.995%', position: 'relative', textAlign: 'center'}}>
		                	<div style={{width: '50%', borderRight: '1px solid #ccc', height: 100}} />
		                	<h3>OR</h3>
		                	<div style={{width: '50%', borderRight: '1px solid #ccc', height: 200}} />
		              	</div>
	              		<div style={{float: 'left', width: '45%', position: 'relative'}}>
                			<h3 style={{marginBottom: 0}}>Search for a Specific Order</h3>
	                		<p style={{marginTop: 0}}>Search by one of the following:</p>
							<form onSubmit={this.handleFindSpecificOrder.bind(this)}>
				                <p>
				                	<label>
					                    <strong>P.O. #</strong><br />
					                    <input onPaste={this.manipulateClipBoardOfPONumber.bind(this)} onChange={this.updateParams.bind(this, 'findSpecificOrderFilter')} value={this.state.findSpecificOrderFilter.param.ponumber} className={this.state.findSpecificOrderFilter.error.ponumberError + (this.state.findSpecificOrderFilter.param.ponumber && ' text-transform-uppercase')} type="text" name="ponumber" placeholder="Exact Match or Starts With" maxLength={50} />
				                	</label>
				                </p>
				                <p>
				                	<label>
				                    	<strong>CSO (Order number)</strong><br />
				                    	<input onKeyPress={this.props.acceptNumbersOnly} onChange={this.updateParams.bind(this, 'findSpecificOrderFilter')} value={this.state.findSpecificOrderFilter.param.orderNumber} className={"almostFullWidth "+this.state.findSpecificOrderFilter.error.orderNumberError} type="text" name="orderNumber" placeholder="Exact Match" />
										{invalidOrderNumberErrorMsg && <span className="red bold">{invalidOrderNumberErrorMsg}</span>}
				                  	</label>
				                </p>
								<p>
				                	<label>
				                    	<strong>Order Reference #</strong><br />
				                    	<input onChange={this.updateParams.bind(this, 'findSpecificOrderFilter')} value={this.state.findSpecificOrderFilter.param.referenceNumber} className={"almostFullWidth "+this.state.findSpecificOrderFilter.error.referenceNumberError + (this.state.findSpecificOrderFilter.param.referenceNumber && ' text-transform-uppercase')} type="text" name="referenceNumber" placeholder="Exact Match" />
				                  	</label>
				                </p>
								<p>
				                	<label>
				                    	<strong>Invoice #</strong><br />
				                    	<input onChange={this.updateParams.bind(this, 'findSpecificOrderFilter')} value={this.state.findSpecificOrderFilter.param.invoiceNumber} className={"almostFullWidth "+this.state.findSpecificOrderFilter.error.invoiceNumberError + (this.state.findSpecificOrderFilter.param.invoiceNumber && ' text-transform-uppercase')} type="text" name="invoiceNumber" placeholder="Exact Match" />
				                  	</label>
				                </p>
	                			<p>
		                  			<input className="blueButton" type="submit" value="Find Orders" />
		                  			&nbsp; &nbsp; &nbsp;<input onClick={this.handleResetForm.bind(this, 'specific')} className="looksLikeALink blue" type="reset" value="clear all" />
		                		</p>
							</form>
	              		</div>
	              		<div className="clear" />
	            	</div> {/* / .filterBoxType2.shadedBox.particularOrderShadedBox */}
	            {/* / .searchForParticularOrderForm#searchForParticularOrderForm */}
	          	</div>
			  	<p className="red bold">{this.state.errorMessage}</p>
				<p className="bold hide">{this.state.filterConfirmationMessage}&nbsp; &nbsp;</p>
				{this.state.ordersListResponse && this.state.ordersListResponse.status &&
			        <div className="push">
			          	<div className="columns twoColumns">
			            	<div className="column column1 verticalAlignBottom">&nbsp;</div>
			            	<div className="column column2 verticalAlignBottom textRight">
			              		{this.state.ordersListResponse && this.state.ordersListResponse.responseObject && this.state.ordersListResponse.responseObject.length?<a onClick={this.handleExport.bind(this)} className="withIcon withExportIcon noUnderline bold uppercase" href="">Export</a>:null}&nbsp;
			            	</div>
			          	</div>
			          	<div className="captionAboveTable captionAboveManageOrdersTable">
				            <div className="columns twoColumns">
				              	<div className="column">
				                	<div className="bold big">{this.state.ordersListResponse && this.state.ordersListResponse.status && this.state.ordersListResponse.responseObject.length} Orders</div>
				              	</div>
				              	<div className="column textRight">
					                <form className="manageOrdersSortBy" name="manageOrdersSortBy" id="manageOrdersSortBy">
					                  	<label>
					                    	Sort by: &nbsp;
					                    	<select onChange={this.handleSortBy.bind(this)} name="sortBy" value={this.state.sortBy}>
											  	<option value="orderNumber,desc">CSO (Order number)</option>
				                                <option value="orderDate,desc">Order Date</option>
												<option value="requestedDeliveryDate,asc">Request Date</option>
				                                <option value="orderStatus,asc">Order Status</option>
					                    	</select>
					                  	</label>
					                </form>
				              	</div>
				            </div>
			          	</div>
			          	<table className={`dataTable manageOrdersTable${isGEAPartsSalesAgreementSelected ? ' pNetManageOrdersTable' : ''}`}>
			            	<thead>
			              		<tr>
			                		<th className="status">Status <a className="questionMarkIcon" href="" onClick={this.handleDialog.bind(this, "OrderStatusDescriptionsOverlayDialog", true)}><img src="../images/icon-question-mark.png" width={12} height={11} alt="What is this?" title="What is this?" /></a></th>
			                		<th className="viewOrderInfo">View Order Info</th>
									<th colSpan={ 3 } className="forInnerTable">
										<table className="innerTable">
											<thead>
												{isGEAPartsSalesAgreementSelected ? 
												<tr>
													<th className="lineNumber">Line Number</th>
													<th className="productNumber">Item</th>
													<th className="quantityOrdered">Order Qty</th>
													<th className="shippedQuantity">Shipped Qty</th>
													<th className="lineStatus">Line Status<br /><a className="questionMarkIcon" href="" onClick={this.handleDialog.bind(this, "LineStatusDescriptionsOverlayDialog", true)}><img src="../images/icon-question-mark.png" width={12} height={11} alt="What is this?" title="What is this?" /></a></th>
												</tr>
												:
												<tr>
													<th className="productNumber">Product #</th>
													<th className="quantityOrdered">Quantity<br />Ordered</th>
													<th className="quantityReserved">Reserved</th>
													<th className="lineStatus">Line Status<br/><a className="questionMarkIcon" href="" onClick={this.handleDialog.bind(this, "LineStatusDescriptionsOverlayDialog", true)}><img src="../images/icon-question-mark.png" width={12} height={11} alt="What is this?" title="What is this?" /></a></th>
													<th className="productStatus">Target<br/>Arrival<br/>Date <br/><a className="questionMarkIcon" href="" onClick={this.handleDialog.bind(this, "TargetArrivalDateDescriptionsOverlayDialog", true)}><img src="../images/icon-question-mark.png" width={12} height={11} alt="What is this?" title="What is this?" /></a></th>
													<th className="expectedAvailableDate">Expected<br/>Available Date<br /><a className="questionMarkIcon" href="" onClick={this.handleDialog.bind(this, "ExpectedAvailableDateOverlayDialog", true)}><img src="../images/icon-question-mark.png" width={12} height={11} alt="What is this?" title="What is this?" /></a></th>
												</tr>}
											</thead>
										</table>
									</th>
			                		{!isGEAPartsSalesAgreementSelected && <th className="actions txt-ctr">Actions/Status<br/><a className="questionMarkIcon" href="" onClick={this.handleDialog.bind(this, "ActionDescriptionsOverlayDialog", true)}><img src="../images/icon-question-mark.png" width={12} height={11} alt="What is this?" title="What is this?" /></a></th>}
			              		</tr>
		            		</thead>
			            	<tbody>
								{this.state.ordersListResponse && this.state.ordersListResponse.status && this.state.ordersListResponse.responseObject.length === 0
									?<tr>
										<td colSpan={6}>No orders found meeting the specified criteria; please try your search again.</td>
									</tr>
									:null
								}
								{this.state.ordersListResponse && this.state.ordersListResponse.status && this.state.ordersListResponse.responseObject.length > 0 && this.state.ordersListResponse.responseObject.map((item, index) => {
									let itemUpdatableOrCancellable = false;
									let { orderHeader, orderDetail, isAnyLineClosed, allLinesAreClosed, allLineAreClosedOrCancelled, allLinesAreClosedOrArrivedAtSDS, anyItemIsBackOrderHold, allLinesAreBackOrderTransferred } = item,
										enteredBy = "",
										{ attribute } = orderHeader.attributes;
									const isPartsOrder = self.isPartsOrder(orderHeader);
									const shippingMethod = orderHeader.shipmentMethod && orderHeader.shipmentMethod.description;
									attribute = attribute?_.find(attribute, ['name', 'Attribute2']):null;
									if(attribute) {
										enteredBy = attribute.value;
									}
									// const { cancelable } = orderHeader;
									let isBackOrderAvailable = false;
									let hideChangeRequestDateOption = false
									let odrDtl = null;
									let isPartAgreement = false;
									let trackingDetails =[];
									if((self.state.selectedOrderType === 'BACKORDER' || (self.isValidSearchForMakingGettingOrderShippingDetailsParallelCalls() && orderHeader.orderStatus === 'BOOKED')) && self.state.orderShippingDetailsList.length) {
										odrDtl = self.state.orderShippingDetailsList.find(order => order.orderNumber === orderHeader.orderNumber);							
									} else if(self.state.orderDetailsByOrderNumber.length) {
										odrDtl = self.state.orderDetailsByOrderNumber.find(order => order.orderNumber === orderHeader.orderNumber);
										odrDtl = odrDtl && odrDtl.response && odrDtl.response.responseObject ? odrDtl.response.responseObject : null;
									}
									self.state.list && self.state.list.map(itemList=>{
										if(itemList.orderNumber == orderHeader.orderNumber){
											trackingDetails.push(itemList.deliveryStatus.P_DELIVERY_STATUS_INFO_TBL_ITEMS)
										}
									})
									if (self.state.orderDetailsByOrderNumber.length) {
										const details = self.state.orderDetailsByOrderNumber.find(order => order.orderNumber === orderHeader.orderNumber);
										if (details && details.response && details.response.responseObject) {
											details.response.responseObject.items.map((lineItem)=>{
												if(lineItem.cancelable == "Yes" || lineItem.updatable =="Yes"){
													 	 itemUpdatableOrCancellable = true;
													 }
												lineItem.relatedServices && lineItem.relatedServices.map((itm) => {
													if(self.isMService(itm.serviceId) && (itm.cancelable == "Yes" || itm.updatable =="Yes")){
														itemUpdatableOrCancellable = true;
													}
												})

											})
											isPartAgreement = details.response.responseObject.agreementName.toLowerCase().indexOf("parts") === 0;
										}
									}
									let fullyReservedOrder = true;
									const expectedAvailableDateDetails = [];
									const isFromAccountClassificationInExceptionList = self.props.isAccountClassificationInExceptionList();
									let isSuggestedShipDateAvailable = false;
									const shipToValue = orderHeader.parties.party.filter((party)=>party.purpose === "SHIP_TO")||[];
									const addressValue = shipToValue[0].party.partySites.site[0].siteLocation.address || null;
									const locationValue = shipToValue[0].party.partySites.site[0].siteLocation.locationId || null;
									let address1 = "";
									let address2 = "";
									let address3 = "";
									let postalCode = "";
									let city = "";
									let stateCode = "";
									let countryCode = "";
									if(addressValue){
										const {address1:add1, address2:add2, address3:add3, postalCode:pcode} = addressValue||{};
										address1 = add1;
										address2 = add2;
										address3 = add3;
										postalCode = pcode;
										if(isGEAPartsSalesAgreementSelected) {
											({city, stateCode, countryCode} = addressValue||{})
										}
									}
									else if(isNaN(locationValue)){
										let splitedValue = locationValue.split("|");
										address1 = splitedValue[0];
										address2 = splitedValue[1];
										address3 = splitedValue[2];
										postalCode = (splitedValue.length >= 4 && splitedValue[5]) ?  splitedValue[5] : null;

										if(isGEAPartsSalesAgreementSelected) {
											city = splitedValue[4];
											stateCode = splitedValue[6];
											countryCode = splitedValue[7];
										}
									}
									
									const job = orderHeader.attributes.attribute.filter((itm)=>itm.name === "Attribute19");
									const orderLineItems = isGEAPartsSalesAgreementSelected ? orderDetail.orderLine.slice(0, 20) : orderDetail.orderLine;

									// let partsOrderType;
									// if(isGEAPartsSalesAgreementSelected && whichTypeOfSearch === 'findSpecificOrder' && partsOrderDetailsList) {
									// 	const {orderDetails: partsOrderDetails} = partsOrderDetailsList.find(partsOrderItem => partsOrderItem.orderNumber === orderHeader.orderNumber) || {};
									// 	partsOrderType = partsOrderDetails && partsOrderDetails.P_OUT_HEADER_REC && partsOrderDetails.P_OUT_HEADER_REC.SHIPMENT_PRIORITY_CODE &&
									// 					(partsOrderDetails.P_OUT_HEADER_REC.SHIPMENT_PRIORITY_CODE[0] === 'R' ?
									// 						'Regular' : partsOrderDetails.P_OUT_HEADER_REC.SHIPMENT_PRIORITY_CODE[0] === 'E' ? 'Emergency' : '');
									// }
									
									return <tr key={index} id={orderHeader.orderNumber}>
						                <td className="status">
						                  	<span title="Order has been shipped and billed.">{orderHeader.orderStatus}</span><br/>
											{self.prepareHoldList(orderHeader, orderDetail.orderLine).map((holdName, indx) => {
												return <div className="red bold" key={indx}>{holdName}</div>
											})}
						                </td>
										<td className="viewOrderInfo">
											<a className="bold" href="" onClick={this.handleFetchOrderDetails.bind(this, orderHeader.orderNumber, orderHeader.orderStatus, 'orderdetails', orderHeader)}>{orderHeader.orderNumber}</a><br />
											{(isGEAPartsSalesAgreementSelected || orderHeader.orderSourceRef.indexOf("CTN") === 0) &&
												<span><strong>Order Reference#:</strong> {orderHeader.orderSourceRef}<br /></span>
											}
											<strong>P.O.#:</strong> {orderHeader.ponumber}<br />
											<strong>Order Date:</strong> {this.props.formatDate(orderHeader.orderDate, 'MM/DD/YY')}<br />
											{isGEAPartsSalesAgreementSelected ? 
												<React.Fragment>
													{/* {whichTypeOfSearch === 'findSpecificOrder' &&
													<React.Fragment><strong>Order Type:</strong> {partsOrderType}<br/></React.Fragment>} */}
													<strong>Shipping Method:</strong> {orderHeader.shipmentMethod.description}<br />
													<strong>Req. Delivery Date:</strong> {this.props.formatDate(orderHeader.requestedDeliveryDate, 'MM/DD/YY')}<br />
													<strong>Order Started By:</strong> {enteredBy}<br />
													<strong>Ship To:</strong> 
													{address1.trim() && (<span>{address1.trim()}, </span>)}
													{address2.trim() && (<span>{address2.trim()}, </span>)}
													{address3.trim() && (<span>{address3.trim()}, </span>)}
													{(city) && (<span>{city.trim()}, </span>)}
													{(stateCode) && (<span>{stateCode.trim()}, </span>)}
													{(postalCode && postalCode !== "" && postalCode !== " ") && (<span>{postalCode.trim()}, </span>)}
													{(countryCode) && (<span>{countryCode.trim()}<br /></span>)}
													{ trackingDetails[0] && trackingDetails[0].map((track, index) => {
														return  track.TRACKING_NUMBER && <span key={index} style={{color:"red"}}><strong>Tracking #:</strong> {track.TRACKING_NUMBER}<br /></span>
													})}
													{self.state.deliveryDetails.map((obj) => {
															const orderDet = (obj.orderdetoutrec && obj.orderdetoutrec[0]) || {};
															const lineDetails = (orderDet.linedetailsrec && orderDet.linedetailsrec.value && orderDet.linedetailsrec.value.linedetails) || [];
															if(orderDet.ordernumber.value == orderHeader.orderNumber){
																return lineDetails.map((line) => {
																	const deliveryDetails = (line.deliverydetailsrec && line.deliverydetailsrec.value && line.deliverydetailsrec.value.deliverydetails) || [];
																	const tripDetails = (deliveryDetails[0] && deliveryDetails[0].tripdetailsrec && deliveryDetails[0].tripdetailsrec.value && deliveryDetails[0].tripdetailsrec.value.tripdetails) || [];
																	return tripDetails.map((trip, ind) => {
																	if (trip &&	trip.appointmentdelivery &&	trip.appointmentdelivery.value) {
																			if (orderHeader.shipmentMethod.description.startsWith("ADC") ||	orderHeader.shipmentMethod.description === "Meet Truck") {
																					return  <p className="bold red"><span key={ind}>Delivery Appt: {trip.appointmentdelivery.value.toString()}<br /></span> </p>;
																			} 
																		}
																 })
															});}
														})}
												</React.Fragment>
												:
												<React.Fragment>
													<span className="hide"><strong>Order Points:</strong> {orderHeader.orderPoints}<br /></span>
													<strong>Shipping Method:</strong> {orderHeader.shipmentMethod.description}<br />
													<strong>Req. Delivery Date:</strong> {this.props.formatDate(orderHeader.requestedDeliveryDate, 'MM/DD/YY')}<br />
													<strong>Order Started By:</strong> {enteredBy}<br />
													<strong>Warehouse:</strong> {orderHeader.warehouse && orderHeader.warehouse.warehouseCode}<br/>
													{(address1 !== " ") && (<span><strong>Addr1:</strong> {address1}<br /></span>)}
													{(address2 !== "  ") && (<span><strong>Addr2:</strong> {address2}<br /></span>)}
													{(address3 !== "  ") && (<span><strong>LOT:</strong> {address3}<br /></span>)}
													{(postalCode && postalCode !== "" && postalCode !== "  ") && (<span><strong>Postal code:</strong> {postalCode}<br /></span>)}
													{ trackingDetails[0] && trackingDetails[0].map((track, index) => {
														return  track.TRACKING_NUMBER && <span key={index} style={{color:"red"}}><strong>Tracking #:</strong> {track.TRACKING_NUMBER}<br /></span>
													})}
													{(job[0].value !== "") && <strong>JOB:</strong> }{job[0].value}
													{self.state.deliveryDetails.map((obj) => {
															const orderDet = (obj.orderdetoutrec && obj.orderdetoutrec[0]) || {};
															const lineDetails = (orderDet.linedetailsrec && orderDet.linedetailsrec.value && orderDet.linedetailsrec.value.linedetails) || [];
															if(orderDet.ordernumber.value == orderHeader.orderNumber){
																return lineDetails.map((line) => {
																	const deliveryDetails = (line.deliverydetailsrec && line.deliverydetailsrec.value && line.deliverydetailsrec.value.deliverydetails) || [];
																	const tripDetails = (deliveryDetails[0] && deliveryDetails[0].tripdetailsrec && deliveryDetails[0].tripdetailsrec.value && deliveryDetails[0].tripdetailsrec.value.tripdetails) || [];
																	return tripDetails.map((trip, ind) => {
																	if (trip &&	trip.appointmentdelivery &&	trip.appointmentdelivery.value) {
																			if (orderHeader.shipmentMethod.description.startsWith("ADC") ||	orderHeader.shipmentMethod.description === "Meet Truck") {
																					return  <p className="bold red"><span key={ind}>Delivery Appt: {trip.appointmentdelivery.value.toString()}<br /></span> </p>;
																			} 
																		}
																 })
															});}
														})}
													<br />
												</React.Fragment>}
										</td>
				                		<td colSpan={3} className="forInnerTable">
				                  			<table className="innerTable">
												<tbody>
													{orderLineItems.map((itm, ind) => {
														if(((isGEAPartsSalesAgreementSelected && orderHeader.orderSourceRef && orderHeader.orderSourceRef.startsWith('CTN') || !isGEAPartsSalesAgreementSelected) ?
															self.props.checkItemIsServiceOrNot(itm.item) === 'service' : false) || itm.lineStatus.toUpperCase() === 'CANCELLED') {
															return null;
														}
														//const orderStatus = self.props.getLineStatusFromMapping(itm.item, orderHeader.shipmentMethod && orderHeader.shipmentMethod.description, itm.lineStatus, itm);
                                                        let orderStatus;
														if (isPartsOrder){
															orderStatus = self.props.getLineStatusFromMappingForParts(itm);
														} else {
															let lineStatusFromOrdersList = odrDtl && odrDtl.items && odrDtl.items.length > 0 && odrDtl.items.find(it => it.lineId.toString() === itm.orderLineId.toString()).lineStatusFromOrderListResponse;
															orderStatus = lineStatusFromOrdersList ? lineStatusFromOrdersList : self.props.getLineStatusFromMapping(itm.item, orderHeader.shipmentMethod && orderHeader.shipmentMethod.description, itm.lineStatus, itm);
														}
														if(!isBackOrderAvailable && orderStatus === 'Backorder Available') {
															isBackOrderAvailable = true; 
														}
														if(hideChangeRequestDateOption == false && orderStatus == 'Backorder Hold'){
															hideChangeRequestDateOption = true
														}
														let suggestedShipDate = '';
														let noSuggestedAssignScheduleShipDateState=false;
														let prdStatus = '';
														if(odrDtl) {
															const itemDetail = odrDtl.items.find(it => it.lineId.toString() === itm.orderLineId.toString());
															if(self.state.selectedOrderType === 'BACKORDER' || (self.isValidSearchForMakingGettingOrderShippingDetailsParallelCalls() && orderHeader.orderStatus === 'BOOKED')) {
																suggestedShipDate = itemDetail.suggestedShipDate ? self.props.pickTheDateFromString(itemDetail.suggestedShipDate, 'MM/DD/YY') : "";									
																if(!suggestedShipDate) {
																	// For the classifications in this lookup, we should display ONLY the Suggested Ship Date
																	// from the shipping service. If there is no value, we should display no ETA, not "NA".
																	if (isFromAccountClassificationInExceptionList) {
																		suggestedShipDate = '';
																	} else {
																		// WCP-7556:
																		// If there is no suggested ship date, and the order date is within today -2 days,
																		// we should continue to display scheduled ship date.
																		if (moment(orderHeader.orderDate).isBetween(moment().add(-2, "days"), moment()) || moment(orderHeader.requestedDeliveryDate) > moment().add(routes.horizon, "days")) {
																			noSuggestedAssignScheduleShipDateState = true
																			suggestedShipDate = itm.scheduleShipDate && self.props.pickTheDateFromString(itm.scheduleShipDate, 'MM/DD/YY')
																		}
																	}
																}else{
																	noSuggestedAssignScheduleShipDateState = false
																	suggestedShipDate = moment(suggestedShipDate).format('MM/DD/YY');
																}
																prdStatus = itemDetail && itemDetail.productStatus;
															} else {	
																if(itm.reserved < itm.orderedQty) {
																	suggestedShipDate = itm.suggestedShipDate;
																	if (!suggestedShipDate) {
																		// For the classifications in this lookup, we should display ONLY the Suggested Ship Date
																		// from the shipping service.  If there is no value, we should display no ETA, not "NA".
																		if (isFromAccountClassificationInExceptionList) {
																			suggestedShipDate = '';
																		} else {
																			// WCP-7556:
																			// If there is no suggested ship date, and the order date is within today -2 days, we should continue to display scheduled ship date.
																			if (moment(orderHeader.orderDate).isBetween(moment().add(-2, "days"), moment())) {
																				suggestedShipDate = itm.scheduledShipDate;
																			}
																		}
																	}
																	suggestedShipDate = suggestedShipDate ? self.props.convertDateToTimeZone(suggestedShipDate).format('MM/DD/YY') : suggestedShipDate;
																	prdStatus = itm.productStatus;
																} else if(itm.reserved === itm.orderedQty) {
																	suggestedShipDate = '';
																	prdStatus = '';
																}
															}
															// check if any line is having suggested ship date or not
															isSuggestedShipDateAvailable = suggestedShipDate ? true : isSuggestedShipDateAvailable;
														}
														// WCP-7556 if not orderdate between today - 2 days then check FP logic
														if (itm.finalProductionDate && itm.finalProductionDate !== 'NULL' && !moment(orderHeader.orderDate).isBetween(moment().add(-2, "days"), moment())) {
															// If there is a FP date before today, display FP in the Expected Available Date
															if (moment(itm.finalProductionDate,'YYYYMMDD').isBefore(moment()) || 
																(moment(itm.finalProductionDate,'YYYYMMDD').isAfter(moment()) && 
																!moment(suggestedShipDate).isAfter(moment().add(routes.horizon, "days").hours(0).minutes(0).seconds(0).milliseconds(0)) &&
																suggestedShipDate != 'NULL' )) {
																suggestedShipDate = self.validateFP({finalProductionDate: itm.finalProductionDate, suggestedShipDate});
															} else {
																// else If there is not an FP date before today, display NA in the Expected Available Date
																suggestedShipDate = 'NA'
															}
														}
														// keep existing logic as it is in case not between today - 2 days
														else if (suggestedShipDate && itm.finalProductionDate) {
															suggestedShipDate = self.validateFP({finalProductionDate: itm.finalProductionDate, suggestedShipDate});
														}
														let fullyReservedLine = true;
														if(self.props.getItemTypeByName(itm.item) !== 'S' && itm.reserved !== itm.orderedQty) {
															fullyReservedOrder = false;
															fullyReservedLine = false;
														}
														let expectedAvailableDate = self.calculateAttributeValue(orderStatus, allLinesAreClosed, allLinesAreClosedOrArrivedAtSDS, item.planNameAndReservedAllLine, shippingMethod, suggestedShipDate, orderHeader);
														const productStatus = self.calculateAttributeValue(orderStatus, allLinesAreClosed, allLinesAreClosedOrArrivedAtSDS, item.planNameAndReservedAllLine, shippingMethod, prdStatus, orderHeader);
														const targetArrivalDate = itm.scheduleArrivalDate === '' || itm.lineStatus === 'ENTERED' || itm.lineStatus === 'CLOSED'? '' : moment(itm.scheduleArrivalDate).format('MM/DD/YY');
														const reservedQty = self.calculateAttributeValue(orderStatus, allLinesAreClosed, allLinesAreClosedOrArrivedAtSDS, item.planNameAndReservedAllLine, shippingMethod, itm.reserved, orderHeader, true);
														expectedAvailableDate = noSuggestedAssignScheduleShipDateState?suggestedShipDate :self.checkForNADate(expectedAvailableDate, suggestedShipDate, orderStatus, isFromAccountClassificationInExceptionList);
														expectedAvailableDateDetails.push({
															index: ind,
															item: itm.item,
															orderLineId: itm.orderLineId.toString(),
															reservedQty,
															expectedAvailableDate
														});
														return isGEAPartsSalesAgreementSelected ?  
														<tr key={ind}>
															<td className="lineNumber txt-ctr">{itm.lineNum}</td>
															<td className="productNumber txt-ctr">
																{/* {(whichTypeOfSearch === 'findSpecificOrder' &&
																	(orderNumber.trim() || referenceNumber.trim() || invoiceNumber.trim())
																)
																	? (itm.internalItem || itm.item)
																	: (itm.inventoryItem || itm.item)
																} */}
																{itm.item}
															</td>
															<td className="quantityOrdered txt-ctr">{itm.orderedQty}</td>
															<td className="shippedQuantity txt-ctr">{itm.shippedQty || 0}</td>
															<td className="lineStatus txt-ctr">{orderStatus}</td>
														</tr>
														:
														<tr key={ind}>
															<td className="productNumber">
																{(whichTypeOfSearch === 'findSpecificOrder' &&
																	(orderNumber.trim() || referenceNumber.trim() || invoiceNumber.trim())
																)
																	? (itm.internalItem || itm.item)
																	: (itm.inventoryItem || itm.item)
																}
															</td>
															<td className="quantityOrdered txt-ctr">{itm.orderedQty}</td>
															<td className="quantityReserved">{orderStatus === 'Shipped'? '' : reservedQty}</td>
                                                            <td className="lineStatus">{orderStatus}</td>
															<td className={`productStatus`}>
																{orderStatus === 'Backorder Available' && fullyReservedLine
																	? <span className="green">Expires</span>
																	: targetArrivalDate
																}
															</td>
															<td className={`expectedAvailableDate ${(
																(expectedAvailableDate === 'NA' && moment(targetArrivalDate).isBefore(moment().add(30,"days"), 'day'))
															|| (moment(expectedAvailableDate).isAfter(moment(itm.scheduleShipDate), 'day') && moment(targetArrivalDate).isBefore(moment().add(30,"days"), 'day'))
															|| expectedAvailableDate === 'FP' || expectedAvailableDate === '6+ mos') ? 'red' : ''}`}>
                                                                {orderStatus === 'Shipped'? '' : orderStatus === 'Backorder Available' && fullyReservedLine
                                                                	? <span className="green">{ moment(self.getLineDate(itm)).format('MM/DD/YY')}</span> : (!fullyReservedLine && expectedAvailableDate)
                                                                }
                                                            </td>
														</tr>
													})}
												</tbody>
											</table>
				                		</td>
					                	{!isGEAPartsSalesAgreementSelected && <td className="actions">
											{!isPunchOutAccess && item.viewAvailableActions === false
												?<div>
													{!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && !isPartAgreement && self.prepareHoldList(orderHeader, orderDetail.orderLine).indexOf('Electronic IF Hold') === -1 && item.paymentType !== 'CREDIT_CARD' && showEditOrderButton && orderHeader.orderStatus === 'ENTERED'
														?<p>
															<a className="blueButton blockButton editOrderButton" href="" onClick={this.handleEditOrder.bind(this, item.orderHeader.orderNumber, index)}>
																Edit Order
															</a>
														</p>
														:null
													}
													{(workOrderAccountClassification.indexOf(customerClassCode)!==-1 && workOrderShippingMethod.indexOf(orderHeader.shipmentMethod.description)!==-1 && (orderHeader.orderStatus === 'BOOKED' || orderHeader.orderStatus === 'CLOSED'))?
														<p>
															<a onClick={this.handleCreateWorkOrder.bind(this, orderHeader.orderNumber, expectedAvailableDateDetails)} className="blueButton blockButton createWorkOrderButton">
																Create Work Order
															</a>
														</p>
														:null  
													}
							                  		{!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && isAnyLineClosed
														?<p>
															<a onClick={this.handleFetchOrderDetails.bind(this, orderHeader.orderNumber, orderHeader.orderStatus, 'proofofdelivery', orderHeader)} className="blueButton blockButton proofOfDeliveryButton" href="">
																Proof of Delivery
															</a>
														</p>
														:null
													}
							                  		{!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && !isPartAgreement && showEditOrderButton && orderHeader.orderStatus === 'ENTERED'
														?<p>
															<a onClick={this.handleCancelOrder.bind(this, orderHeader.orderNumber)} className="blueButton blockButton deleteProductsButton" href="">
																Cancel Order
															</a>
														</p>
														:null
													}
							                  		{!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && !isPartAgreement && self.prepareHoldList(orderHeader, orderDetail.orderLine).indexOf('Electronic IF Hold') === -1 &&
													 item.paymentType !== 'CREDIT_CARD' && showEditOrderButton && orderHeader.orderStatus === 'BOOKED' && item.showDeleteButton && (item.updatable || item.cancelable || itemUpdatableOrCancellable ) && !allLinesAreBackOrderTransferred 
														?<div>
															<p>
																<a onClick={this.handleUpdateBookedOrder.bind(this, index, allLinesAreClosed, allLinesAreClosedOrArrivedAtSDS, item.orderHeader.orderNumber, orderHeader.shipmentMethod.description, expectedAvailableDateDetails, item)} className="blueButton blockButton deleteProductsButton" href="">
																	Edit Order
																</a>
																<span style={{color:"red"}}>{self.state.checkAvailabilityIndex == index?"Edit not available. Please try later.":""}</span>
															</p>
															{!allLineAreClosedOrCancelled && !hideChangeRequestDateOption &&
																<p>
																	<a href="" onClick={this.handleChangeRequestedDeliveryDate.bind(this, index, item.orderHeader, fullyReservedOrder, expectedAvailableDateDetails)} className="blueButton blockButton deleteProductsButton">Change Requested Delivery</a>
																</p>
															}
														</div>
														:null
													}
													{!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && !isPartAgreement && item.paymentType !== 'CREDIT_CARD' && showEditOrderButton && orderHeader.orderStatus === 'BOOKED' && item.showDeleteButton && item.cancelable
														?<p>
															<a onClick={this.handleCancelOrder.bind(this, orderHeader.orderNumber)} className="blueButton blockButton deleteProductsButton" href="">
																Cancel Order
															</a>
														</p>
														:null
													}
													{item.paymentType == 'CREDIT_CARD' && item.cancelable
														?<p>
															<a onClick={this.handleCancelOrder.bind(this, orderHeader.orderNumber)} className="blueButton blockButton deleteProductsButton" href="">
																Cancel Order
															</a>
														</p>
														:null
													}
													{!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && item.showViewSerialsButton?<p><a onClick={this.handleFetchOrderDetails.bind(this, orderHeader.orderNumber, orderHeader.orderStatus, 'lookupserialno', orderHeader)} className="blueButton blockButton deleteProductsButton" href="">View Serials</a></p>:null}
													{!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && isBackOrderAvailable && showEditOrderButton && (orderHeader.orderStatus === 'BOOKED' || orderHeader.orderStatus === 'ENTERED') &&
														<p>
															<a onClick={this.handleManageBackorders.bind(this)} className="blueButton blockButton deleteProductsButton" href="">
																Manage Backorders
															</a>
														</p>
													}
													{!(
														(!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && !isPartAgreement && self.prepareHoldList(orderHeader, orderDetail.orderLine).indexOf('Electronic IF Hold') === -1 && item.paymentType !== 'CREDIT_CARD' && showEditOrderButton && orderHeader.orderStatus === 'ENTERED') ||
														(!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && isAnyLineClosed) ||
														(!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && !isPartAgreement && showEditOrderButton && orderHeader.orderStatus === 'ENTERED') ||
														(!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && !isPartAgreement && self.prepareHoldList(orderHeader, orderDetail.orderLine).indexOf('Electronic IF Hold') === -1 && item.paymentType !== 'CREDIT_CARD' && showEditOrderButton && orderHeader.orderStatus === 'BOOKED' && item.showDeleteButton && item.updatable && !allLinesAreBackOrderTransferred) ||
														(!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && !isPartAgreement && item.paymentType == 'CREDIT_CARD' && showEditOrderButton && orderHeader.orderStatus === 'BOOKED' && item.showDeleteButton && item.cancelable) ||
														(!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && item.showViewSerialsButton) ||
														(!self.checkIfInventoryFinancingAndHoldComments(orderHeader) && isBackOrderAvailable && showEditOrderButton && (orderHeader.orderStatus === 'BOOKED' || orderHeader.orderStatus === 'ENTERED')) ||
														((workOrderAccountClassification.indexOf(customerClassCode)!==-1 && workOrderShippingMethod.indexOf(orderHeader.shipmentMethod.description)!==-1 && (orderHeader.orderStatus === 'BOOKED' || orderHeader.orderStatus === 'CLOSED')))
													) && <p className="bold">No Actions Available</p>
													}
													<p className="red bold">{item.priceServiceDownErrorMessage}</p>
												</div>
												:(
													!self.props.isSelectedAccountNumberAsIs && !isPunchOutAccess
														? <p><a name="actions1" href="" onClick={this.hideViewAvailableActions.bind(this, index, orderHeader.orderNumber)} className="viewAvailActions">View Available Actions</a></p>
														: null
												)
											}
											{orderHeader.orderStatus === 'BOOKED' && <div>
												{item.viewStatusLink === false
													?self.getExpectedShipDate(anyItemIsBackOrderHold, fullyReservedOrder, allLinesAreClosed, allLinesAreClosedOrArrivedAtSDS, shippingMethod, item.eta, item.planNameAndReservedAllLine, self.state.selectedOrderType, item.anyItemHavingPlanName, item)
													:<p>
														{
															(
																(isFromAccountClassificationInExceptionList && isSuggestedShipDateAvailable) ||
																(!isFromAccountClassificationInExceptionList)
															) &&
																<a name="actions1" href="" onClick={(e) => this.hideViewStatus(index, orderHeader.orderNumber, orderHeader.shipmentMethod.description, item, e)} className="viewAvailActions">View Status</a>
														}
													</p>
												}
											</div>}
					                	</td>}
				              		</tr>
								})}
			            	</tbody>
			          	</table>
			        </div>
				}
				{this.state.showTrackOrderOverlayDialog?<TrackOrderOverlayDialog handleDialog={this.handleDialog.bind(this)} showDialog={true} />:null}
				{this.state.showOrderStatusDescriptionsOverlayDialog?<OrderStatusDescriptionsOverlayDialog handleDialog={this.handleDialog.bind(this)} showDialog={true} />:null}
				{this.state.showActionDescriptionsOverlayDialog?<ActionDescriptionsOverlayDialog handleDialog={this.handleDialog.bind(this)} showDialog={true} />:null}
				{this.state.showLineStatusDescriptionsOverlayDialog?<LineStatusDescriptionsOverlayDialog handleDialog={this.handleDialog.bind(this)} showDialog={true} />:null}
				{this.state.showTargetArrivalDateDescriptionsOverlayDialog ? <TargetArrivalDateDescriptionsOverlayDialog handleDialog={this.handleDialog.bind(this)} showDialog={true} />:null}
				{this.state.showProductStatusDescriptionsOverlayDialog?<ProductStatusDescriptionsOverlayDialog handleDialog={this.handleDialog.bind(this)} showDialog={true} />:null}
				{this.state.showExpectedAvailableDateOverlayDialog?<ExpectedAvailableDateOverlayDialog handleDialog={this.handleDialog.bind(this)} showDialog={true} />:null}
				{this.state.showDeleteOrderConfirmationOverlaydialog?<GenericOverlayDialog flag={'DeleteOrderConfirmationOverlaydialog'} handleYes={this.handleCancelYesConfirmation.bind(this)} genericDialogHeading={this.state.genericDialogHeading} genericDialogText={this.state.genericDialogText} buttons={this.state.modalButtons} handleDialog={this.handleDialog.bind(this)} showDialog={true} />:null}
				{this.state.showNoPODFoundOverlaydialog?<GenericOverlayDialog flag={'NoPODFoundOverlaydialog'} genericDialogHeading={this.state.genericDialogHeading} genericDialogText={this.state.genericDialogText} buttons={this.state.modalButtons} handleDialog={this.handleDialog.bind(this)} showDialog={true} />:null}
				{this.state.showCancelOrderConfirmationOverlaydialog?<GenericOverlayDialog flag={'CancelOrderConfirmationOverlaydialog'} handleYes={this.handleCancelEntireOrderConfirmation.bind(this)} genericDialogHeading={this.state.genericDialogHeading} genericDialogText={this.state.genericDialogText} buttons={this.state.modalButtons} handleDialog={this.handleDialog.bind(this)} showDialog={true} />:null}
				{this.state.showSuccessfullyCancelledOverlayDialog?<GenericOverlayDialog flag={'SuccessfullyCancelledOverlayDialog'} genericDialogHeading={this.state.genericDialogHeading} genericDialogText={this.state.genericDialogText} buttons={this.state.modalButtons} handleDialog={this.handleDialog.bind(this)} showDialog={true} />:null}
				{this.state.showChangeRequestedDeliveryDateOverlayDialog?<ChangeRequestedDeliveryDateOverlayDialog fromWhichPage="manageOrder" callBackAfterRDDUpdate={this.hideAllAvailableActions.bind(this)} orderDetail={this.state.currentOrderDetail} pickTheDateFromString={this.props.pickTheDateFromString} isWeekday={this.props.isWeekday} shippingMethod={self.state.orderHeader ? self.state.orderHeader.shipmentMethod.description : ''} handleDialog={this.handleDialog.bind(this)} showDialog={true} />:null}
	            {this.state.showAddServicesForWorkOrderDialog && <AddServicesForWorkOrderDialog 
					availableServices={this.state.availableServices}
					handleDialog={this.handleDialog}
					formatAmount2Decimal={this.props.formatAmount2Decimal}
					items={self.state.orderDetails.items}
					getPIMItemInfo={this.props.getPIMItemInfo}
					showDialog={true}
					requiredPayloadForServicePricing={this.state.requiredPayloadForServicePricing}
					orderDetails={self.state.orderDetails}
				/>}
		  	</div>
        );
    }
}
const mapStateToProps = (state) => {
	return {state};
};

const mapDispatchToProps = (dispatch) => ({
	getOrderList: (queryStringParams, callback) => dispatch(getOrderList(queryStringParams, callback)),
	getOrderDetails: (queryStringParams, callback, saveToStore = true, isPart = false) => dispatch(getOrderDetails(queryStringParams, callback, saveToStore, isPart)),
	exportManageOrdersDetails: (payload, queryStringParams, callback) => dispatch(exportManageOrdersDetails(payload, queryStringParams, callback)),
	cancelOrderDetails: (payload, queryStringParams, callback) => dispatch(cancelOrderDetails(payload, queryStringParams, callback)),
	saveManageOrdersListBackup: (manageOrdersListState) => dispatch(saveManageOrdersListBackup(manageOrdersListState)),
	getSignatureDetails: (queryStringParams, callback) => dispatch(getSignatureDetails(queryStringParams, callback)),
	saveCreateOrderPayload: (data) => dispatch(saveCreateOrderPayload(data)),
	saveBookedOrders: (data) => dispatch(saveBookedOrders(data)),
	checkAvailabilityGeneric: (payload, hybridQueryParams, whereToSave, showLoader, callback, redirectToError) => dispatch(checkAvailabilityGeneric(payload, hybridQueryParams, whereToSave, showLoader, callback, redirectToError)),
	getPriceOrder: (payload, params, response) => dispatch(getPriceOrder(payload, params, response)),
	getPOD: (queryString, callback) => dispatch(getPOD(queryString, callback)),
	saveDeletedItems: (data) => dispatch(saveDeletedItems(data)),
	getBillingReferences: (queryString, callback, errorRedirection) => dispatch(getBillingReferences(queryString, callback, errorRedirection)),
	checkServicePrices: (payload, hybridQueryParams, callback) => dispatch(checkServicePrices(payload, hybridQueryParams, callback)),
	saveBillingReferences: (data) => dispatch(saveBillingReferences(data)),
	saveLookSerialNoData: (data) => dispatch(saveLookSerialNoData(data)),
	saveOrderDetails: (data) => dispatch(saveOrderDetails(data)),
	ajaxRequestInitiated: () => dispatch(ajaxRequestInitiated()),
	ajaxRequestCompleted: () => dispatch(ajaxRequestCompleted()),
	saveOrderShippingDetails: (data) => dispatch(saveOrderShippingDetails(data)),
	saveTrackingDetails: (data) => dispatch(saveTrackingDetails(data)),
	saveBackOrders: (data) => dispatch(saveBackOrders(data)),
	getShippingMethod: (queryString, callback) => dispatch(getShippingMethod(queryString, callback)),
	deleteOrderDetails: (payload, queryStringParams, showLoader, callback) => dispatch(deleteOrderDetails(payload, queryStringParams, showLoader, callback)),
	resetErrorLog: () => dispatch(resetErrorLog()),
	getPIMItemInfo: (payload, params, response) => dispatch(getPIMItemInfo(payload, params, response)),
	getOrderableServices: (payload, params, response) => dispatch(getOrderableServices(payload, params,response)),
});

ManageOrders = connect(mapStateToProps, mapDispatchToProps)(ManageOrders);
export default ManageOrders;
