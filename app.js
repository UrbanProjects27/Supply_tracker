(function () {
  var supabaseConfig = window.DISPATCH_SUPABASE_CONFIG || {};
  var SUPABASE_URL = supabaseConfig.url || "";
  var SUPABASE_ANON_KEY = supabaseConfig.publishableKey || "";
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    window.console.error("DispatchFlow is missing its Supabase configuration.");
  }
  var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  var defaultLocations = [
    "Ahmedabad", "Delhi", "Bangalore", "Lucknow", "Mumbai", "Kolkata", "Jaipur",
    "Rajpura", "Hyderabad", "Pune", "Indore", "Chennai", "Guwahati", "Gurugram", "Ghaziabad"
  ];

  var defaultBuyerNames = [
    "ARIPL", "ARIPL_Fresh", "ARIPL_Now", "BigBasket", "Blinkit", "CityMall", "Clicktech",
    "ETRADE", "ETRADE_Fresh", "FirstCry", "fk-grocery", "fk-hyperlocal", "fk-national",
    "Purplle", "RK_World", "RK_World_Fresh", "RK_World_Now", "Swiggy", "Tatacliq", "Trumeds",
    "Urban", "Zepto"
  ];

  var defaultOrderStatuses = ["Confirmed", "Part Allocated", "Allocated"];
  var locations = defaultLocations.slice();
  var buyerNames = defaultBuyerNames.slice();
  var buyerDirectory = [];
  var orderStatusOptions = defaultOrderStatuses.slice();
  var masterDataSource = "legacy";
  var masterDataTablesReady = false;

  var roleLabels = { admin: "Admin", sales: "Sales Team", ops: "Ops Team", fc: "FC Team", "fc admin": "FC Admin" };
  var roleDescriptions = {
    admin: "You are signed in as Admin. This browser version uses Supabase Auth and shared order data.",
    sales: "You are signed in as Sales Team. Create and update shared appointment, buyer, location, and order details.",
    ops: "You are signed in as Ops Team. Filter shared orders by date, buyer code, and order status, then assign picklist details.",
    fc: "You are signed in as FC Team. Filter shared orders by appointment date and allowed location, then complete dispatch.",
    "fc admin": "You are signed in as FC Admin. Use the FC workflow with visibility across all locations."
  };
  var fallbackProfilesByEmail = {
    "mis@urbanretail.in": { full_name: "System Admin", role: "admin" },
    "rishikakushwaha@urbanretail.in": { full_name: "Sales User", role: "sales" },
    "support@urbanretail.in": { full_name: "Ops User", role: "ops" },
    "sunilkumar@urbanretail.in": { full_name: "FC User", role: "fc" }
  };

  var loginView = document.getElementById("loginView");
  var appView = document.getElementById("appView");
  var loginForm = document.getElementById("loginForm");
  var loginMessage = document.getElementById("loginMessage");
  var resetPasswordButton = document.getElementById("resetPasswordButton");
  var resetDataButton = document.getElementById("resetDataButton");
  var logoutButton = document.getElementById("logoutButton");
  var topbarLogoutButton = document.getElementById("topbarLogoutButton");
  var roleDescription = document.getElementById("roleDescription");
  var currentUserName = document.getElementById("currentUserName");
  var currentUserRole = document.getElementById("currentUserRole");
  var currentUserAccess = document.getElementById("currentUserAccess");
  var dispatchHero = document.getElementById("dispatchHero");
  var boardPanel = document.getElementById("boardPanel");
  var dispatchSidebar = document.getElementById("dispatchSidebar");
  var menuToggle = document.getElementById("menuToggle");
  var dispatchNavButtons = document.querySelectorAll("[data-dispatch-page]");
  var topbarUserName = document.getElementById("topbarUserName");
  var topbarUserRole = document.getElementById("topbarUserRole");
  var topbarAvatar = document.getElementById("topbarAvatar");
  var sidebarProfileName = document.getElementById("sidebarProfileName");
  var sidebarProfileRole = document.getElementById("sidebarProfileRole");
  var sidebarAvatar = document.getElementById("sidebarAvatar");
  var topbarDate = document.getElementById("topbarDate");
  var activeDispatchPage = "dashboard";
  var adminPanel = document.getElementById("adminPanel");
  var dashboardPanel = document.getElementById("dashboardPanel");
  var salesPanel = document.getElementById("salesPanel");
  var opsPanel = document.getElementById("opsPanel");
  var fcPanel = document.getElementById("fcPanel");
  var userFormMessage = document.getElementById("userFormMessage");
  var deleteAllOrdersButton = document.getElementById("deleteAllOrdersButton");
  var deleteDispatchedOrdersButton = document.getElementById("deleteDispatchedOrdersButton");
  var purgeDeletedOrdersButton = document.getElementById("purgeDeletedOrdersButton");
  var createUserForm = document.getElementById("createUserForm");
  var newUserFullNameInput = document.getElementById("newUserFullName");
  var newUserEmailInput = document.getElementById("newUserEmail");
  var newUserPasswordInput = document.getElementById("newUserPassword");
  var newUserRoleSelect = document.getElementById("newUserRole");
  var newUserLocationChoices = document.getElementById("newUserLocationChoices");
  var createUserButton = document.getElementById("createUserButton");
  var createUserMessage = document.getElementById("createUserMessage");
  var masterBuyerCodeInput = document.getElementById("masterBuyerCodeInput");
  var masterBuyerInput = document.getElementById("masterBuyerInput");
  var addBuyerButton = document.getElementById("addBuyerButton");
  var masterBuyerList = document.getElementById("masterBuyerList");
  var masterLocationInput = document.getElementById("masterLocationInput");
  var addLocationButton = document.getElementById("addLocationButton");
  var masterLocationList = document.getElementById("masterLocationList");
  var masterOrderStatusInput = document.getElementById("masterOrderStatusInput");
  var addOrderStatusButton = document.getElementById("addOrderStatusButton");
  var masterOrderStatusList = document.getElementById("masterOrderStatusList");
  var masterDataMessage = document.getElementById("masterDataMessage");
  var auditActionFilter = document.getElementById("auditActionFilter");
  var auditDateFilter = document.getElementById("auditDateFilter");
  var auditSearchInput = document.getElementById("auditSearchInput");
  var resetAuditFiltersButton = document.getElementById("resetAuditFiltersButton");
  var auditHistoryBody = document.getElementById("auditHistoryBody");
  var auditHistoryMessage = document.getElementById("auditHistoryMessage");

  var downloadTemplateButton = document.getElementById("downloadTemplateButton");
  var exportSalesButton = document.getElementById("exportSalesButton");
  var exportAllOrdersButton = document.getElementById("exportAllOrdersButton");
  var downloadOpsTemplateButton = document.getElementById("downloadOpsTemplateButton");
  var exportOpsButton = document.getElementById("exportOpsButton");
  var toggleOpsEditModeButton = document.getElementById("toggleOpsEditModeButton");
  var downloadFcTemplateButton = document.getElementById("downloadFcTemplateButton");
  var exportFcButton = document.getElementById("exportFcButton");
  var exportDispatchReportButton = document.getElementById("exportDispatchReportButton");
  var exportBoardButton = document.getElementById("exportBoardButton");
  var exportPendingPicklistReportButton = document.getElementById("exportPendingPicklistReportButton");
  var exportPendingDispatchReportButton = document.getElementById("exportPendingDispatchReportButton");
  var exportDispatchedTodayReportButton = document.getElementById("exportDispatchedTodayReportButton");
  var resetDashboardFiltersButton = document.getElementById("resetDashboardFiltersButton");
  var salesImportFile = document.getElementById("salesImportFile");
  var salesUtilityMessage = document.getElementById("salesUtilityMessage");
  var salesOrderSearchInput = document.getElementById("salesOrderSearch");
  var salesOrderOptions = document.getElementById("salesOrderOptions");
  var loadSalesOrderButton = document.getElementById("loadSalesOrderButton");
  var resetSalesFormButton = document.getElementById("resetSalesFormButton");
  var salesEditMessage = document.getElementById("salesEditMessage");

  var orderForm = document.getElementById("orderForm");
  var appointmentDateInput = document.getElementById("appointmentDate");
  var buyerCodeInput = document.getElementById("buyerCode");
  var buyerNameInput = document.getElementById("buyerName");
  var orderNumberInput = document.getElementById("orderNumber");
  var orderStatusSelect = document.getElementById("orderStatus");
  var locationSelect = document.getElementById("location");
  var appointmentIdInput = document.getElementById("appointmentId");
  var maxQtyInput = document.getElementById("maxQty");
  var timeSlotInput = document.getElementById("timeSlot");
  var statusSelect = document.getElementById("status");
  var salesPicklistNumberInput = document.getElementById("salesPicklistNumber");

  var picklistForm = document.getElementById("picklistForm");
  var opsAppointmentDateSelect = document.getElementById("opsAppointmentDate");
  var opsLocationSelect = document.getElementById("opsLocation");
  var opsBuyerCodeSelect = document.getElementById("opsBuyerCode");
  var opsOrderStatusSelect = document.getElementById("opsOrderStatus");
  var picklistOrderSelect = document.getElementById("picklistOrder");
  var selectedOpsOrderText = document.getElementById("selectedOpsOrderText");
  var copyOpsOrderButton = document.getElementById("copyOpsOrderButton");
  var picklistNumberInput = document.getElementById("picklistNumber");
  var picklistQtyInput = document.getElementById("picklistQty");
  var opsEmptyMessage = document.getElementById("opsEmptyMessage");
  var opsUtilityMessage = document.getElementById("opsUtilityMessage");

  var dispatchForm = document.getElementById("dispatchForm");
  var fcAppointmentDateSelect = document.getElementById("fcAppointmentDate");
  var fcBuyerCodeSelect = document.getElementById("fcBuyerCode");
  var dispatchOrderSelect = document.getElementById("dispatchOrder");
  var vehicleNumberInput = document.getElementById("vehicleNumber");
  var vehicleTypeInput = document.getElementById("vehicleType");
  var boxesInput = document.getElementById("boxes");
  var dispatchStatusSelect = document.getElementById("dispatchStatus");
  var fcUtilityMessage = document.getElementById("fcUtilityMessage");

  var tableBody = document.getElementById("ordersTableBody");
  var boardMessage = document.getElementById("boardMessage");
  var searchInput = document.getElementById("searchInput");
  var boardAppointmentDateSelect = document.getElementById("boardAppointmentDate");
  var boardDispatchStatusSelect = document.getElementById("boardDispatchStatus");
  var boardBuyerNameSelect = document.getElementById("boardBuyerName");
  var boardBuyerCodeSelect = document.getElementById("boardBuyerCode");
  var boardLocationSelect = document.getElementById("boardLocation");
  var boardShowDeleted = document.getElementById("boardShowDeleted");
  var exportIncludeDispatched = document.getElementById("exportIncludeDispatched");
  var resetBoardFiltersButton = document.getElementById("resetBoardFiltersButton");
  var previousPageButton = document.getElementById("previousPageButton");
  var nextPageButton = document.getElementById("nextPageButton");
  var paginationLabel = document.getElementById("paginationLabel");
  var pageSizeSelect = document.getElementById("pageSizeSelect");
  var totalOrders = document.getElementById("totalOrders");
  var readyOrders = document.getElementById("readyOrders");
  var dashboardStats = document.getElementById("dashboardStats");
  var dashboardByLocationBody = document.getElementById("dashboardByLocationBody");
  var dashboardLocationAppointmentDate = document.getElementById("dashboardLocationAppointmentDate");
  var dashboardByBuyerBody = document.getElementById("dashboardByBuyerBody");
  var dashboardBuyerAppointmentDate = document.getElementById("dashboardBuyerAppointmentDate");
  var orderDetailsPanel = document.getElementById("orderDetailsPanel");
  var orderDetailsContent = document.getElementById("orderDetailsContent");
  var detailsOrderTitle = document.getElementById("detailsOrderTitle");
  var closeOrderDetailsButton = document.getElementById("closeOrderDetailsButton");
  var appToast = document.getElementById("appToast");

  var currentSession = null;
  var currentProfile = null;
  var orders = [];
  var dispatchReports = [];
  var auditEntries = [];
  var fcAccess = [];
  var currentSalesOrderId = "";
  var currentSalesOrderUpdatedAt = "";
  var opsEditMode = false;
  var toastTimer = null;
  var boardSearchTimer = null;
  var currentPage = 1;
  var loadingCount = 0;
  var auditTablesReady = false;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setSelectOptions(selectElement, placeholder, values) {
    var html = '<option value="">' + placeholder + "</option>";
    var i;
    for (i = 0; i < values.length; i += 1) {
      html += '<option value="' + escapeHtml(values[i].value) + '">' + escapeHtml(values[i].label) + "</option>";
    }
    selectElement.innerHTML = html;
  }

  function loadLegacyMasterData() {
    var buyers = window.localStorage.getItem("urbanRetailBuyerNames");
    var storedLocations = window.localStorage.getItem("urbanRetailLocations");
    var statuses = window.localStorage.getItem("urbanRetailOrderStatuses");

    try {
      buyerNames = buyers ? JSON.parse(buyers) : defaultBuyerNames.slice();
    } catch (error) {
      buyerNames = defaultBuyerNames.slice();
    }

    try {
      locations = storedLocations ? JSON.parse(storedLocations) : defaultLocations.slice();
    } catch (error) {
      locations = defaultLocations.slice();
    }

    try {
      orderStatusOptions = statuses ? JSON.parse(statuses) : defaultOrderStatuses.slice();
    } catch (error) {
      orderStatusOptions = defaultOrderStatuses.slice();
    }

    buyerNames = uniqueValues(buyerNames);
    buyerDirectory = [];
    locations = uniqueValues(locations);
    orderStatusOptions = uniqueValues(orderStatusOptions);
  }

  function saveLegacyMasterData() {
    window.localStorage.setItem("urbanRetailBuyerNames", JSON.stringify(buyerNames));
    window.localStorage.setItem("urbanRetailLocations", JSON.stringify(locations));
    window.localStorage.setItem("urbanRetailOrderStatuses", JSON.stringify(orderStatusOptions));
  }

  function getMasterDataTableName(type) {
    if (type === "buyer") {
      return "master_buyers";
    }
    if (type === "location") {
      return "master_locations";
    }
    return "master_order_statuses";
  }

  function setMasterDataStatusMessage(customMessage) {
    if (customMessage) {
      masterDataMessage.textContent = customMessage;
      return;
    }

    if (masterDataSource === "shared") {
      masterDataMessage.textContent = "Shared master data is active for all users.";
      return;
    }

    if (currentProfile && currentProfile.role === "admin") {
      masterDataMessage.textContent = "Shared master data is not active yet. Run supabase-master-data.sql in Supabase to share these lists across all users.";
      return;
    }

    masterDataMessage.textContent = "";
  }

  async function loadMasterDataFromSupabase() {
    var buyersResponse;
    var locationsResponse;
    var statusesResponse;
    var hasError;

    if (!currentSession) {
      loadLegacyMasterData();
      masterDataSource = "legacy";
      masterDataTablesReady = false;
      refreshManagedOptions();
      setMasterDataStatusMessage();
      return;
    }

    buyersResponse = await supabaseClient
      .from("master_buyers")
      .select("code,value")
      .eq("active", true)
      .not("code", "is", null)
      .order("code");

    locationsResponse = await supabaseClient
      .from("master_locations")
      .select("value")
      .eq("active", true)
      .order("value");

    statusesResponse = await supabaseClient
      .from("master_order_statuses")
      .select("value")
      .eq("active", true)
      .order("value");

    hasError = buyersResponse.error || locationsResponse.error || statusesResponse.error;

    if (hasError) {
      loadLegacyMasterData();
      masterDataSource = "legacy";
      masterDataTablesReady = false;
      refreshManagedOptions();
      setMasterDataStatusMessage();
      return;
    }

    buyerDirectory = (buyersResponse.data || []).map(function (row) {
      return { code: String(row.code || "").trim(), value: String(row.value || "").trim() };
    }).filter(function (row) {
      return row.code && row.value;
    });
    buyerNames = uniqueValues(buyerDirectory.map(function (row) { return row.value; }));
    locations = uniqueValues((locationsResponse.data || []).map(function (row) { return row.value; }));
    orderStatusOptions = uniqueValues((statusesResponse.data || []).map(function (row) { return row.value; }));

    masterDataSource = "shared";
    masterDataTablesReady = true;
    refreshManagedOptions();
    setMasterDataStatusMessage();
  }

  function renderMasterDataManager() {
    function renderChipList(target, values, type) {
      var html = "";
      values.forEach(function (value) {
        html += '<span class="data-chip">' + escapeHtml(value) + '<button type="button" class="chip-remove-btn" data-type="' + escapeHtml(type) + '" data-value="' + escapeHtml(value) + '">x</button></span>';
      });
      target.innerHTML = html || '<span class="muted">No values yet.</span>';
    }

    var buyerHtml = "";
    buyerDirectory.forEach(function (buyer) {
      buyerHtml += '<span class="data-chip">' + escapeHtml(buyer.code + " — " + buyer.value) + '<button type="button" class="chip-remove-btn" data-type="buyer" data-value="' + escapeHtml(buyer.code) + '">x</button></span>';
    });
    masterBuyerList.innerHTML = buyerHtml || '<span class="muted">No buyer codes configured yet.</span>';
    renderChipList(masterLocationList, locations, "location");
    renderChipList(masterOrderStatusList, orderStatusOptions, "status");
  }

  function getBuyerByCode(code) {
    var normalizedCode = String(code || "").trim();
    return buyerDirectory.find(function (buyer) {
      return buyer.code === normalizedCode;
    }) || null;
  }

  function syncBuyerNameFromCode() {
    var buyer = getBuyerByCode(buyerCodeInput.value);
    buyerNameInput.value = buyer ? buyer.value : "";
  }

  function renderUserLocationChoices() {
    var selectedLocations = {};
    var html = "";

    if (!newUserLocationChoices) {
      return;
    }

    Array.prototype.forEach.call(newUserLocationChoices.querySelectorAll("input:checked"), function (input) {
      selectedLocations[input.value] = true;
    });

    locations.forEach(function (location) {
      html += '<label class="checkbox-item"><input type="checkbox" name="newUserLocation" value="' + escapeHtml(location) + '"' + (selectedLocations[location] ? " checked" : "") + "><span>" + escapeHtml(location) + "</span></label>";
    });
    newUserLocationChoices.innerHTML = html || '<span class="muted">Add locations in Master Data before creating an FC user.</span>';
  }

  function refreshManagedOptions() {
    var selectedLocation = locationSelect.value;
    var selectedBuyerCode = buyerCodeInput.value;
    var selectedOrderStatus = orderStatusSelect.value;
    var locationHtml = "";
    var buyerCodeHtml = '<option value="">Select buyer code</option>';
    var orderStatusHtml = "";

    locations.forEach(function (location) {
      locationHtml += '<option value="' + escapeHtml(location) + '">' + escapeHtml(location) + "</option>";
    });
    buyerDirectory.forEach(function (buyer) {
      buyerCodeHtml += '<option value="' + escapeHtml(buyer.code) + '">' + escapeHtml(buyer.code + " — " + buyer.value) + "</option>";
    });
    orderStatusOptions.forEach(function (statusOption) {
      orderStatusHtml += '<option value="' + escapeHtml(statusOption) + '">' + escapeHtml(statusOption) + "</option>";
    });

    locationSelect.innerHTML = locationHtml;
    buyerCodeInput.innerHTML = buyerCodeHtml;
    orderStatusSelect.innerHTML = orderStatusHtml;

    if (selectedLocation && locations.indexOf(selectedLocation) !== -1) {
      locationSelect.value = selectedLocation;
    } else if (!locationSelect.value && locations.length) {
      locationSelect.value = locations[0];
    }
    if (selectedBuyerCode && getBuyerByCode(selectedBuyerCode)) {
      buyerCodeInput.value = selectedBuyerCode;
    } else if (buyerDirectory.length) {
      buyerCodeInput.value = buyerDirectory[0].code;
    }
    syncBuyerNameFromCode();
    if (selectedOrderStatus && orderStatusOptions.indexOf(selectedOrderStatus) !== -1) {
      orderStatusSelect.value = selectedOrderStatus;
    } else if (!orderStatusSelect.value && orderStatusOptions.length) {
      orderStatusSelect.value = orderStatusOptions[0];
    }

    renderMasterDataManager();
    renderUserLocationChoices();
  }

  async function addBuyerMasterData() {
    var code = String(masterBuyerCodeInput.value || "").trim();
    var value = String(masterBuyerInput.value || "").trim();
    var response;

    if (!code || !value) {
      masterDataMessage.textContent = "Enter both a Buyer Code and Buyer Name.";
      return;
    }
    if (!masterDataTablesReady) {
      masterDataMessage.textContent = "Buyer codes require the shared Supabase master data table.";
      return;
    }
    if (getBuyerByCode(code)) {
      masterDataMessage.textContent = "Buyer Code already exists.";
      return;
    }

    response = await supabaseClient
      .from("master_buyers")
      .upsert({ code: code, value: value, active: true }, { onConflict: "value" });

    if (response.error) {
      masterDataMessage.textContent = response.error.message;
      return;
    }

    masterBuyerCodeInput.value = "";
    masterBuyerInput.value = "";
    await loadMasterDataFromSupabase();
    refreshUi();
    masterDataMessage.textContent = "Buyer code added to the shared list.";
    showToast("Buyer code added.");
  }

  async function addMasterDataValue(type, value) {
    var cleanedValue = String(value || "").trim();
    var values;
    var duplicateMessage;
    var response;

    if (!cleanedValue) {
      masterDataMessage.textContent = "Enter a value first.";
      return;
    }

    if (type === "location") {
      values = locations;
      duplicateMessage = "Location already exists.";
    } else {
      values = orderStatusOptions;
      duplicateMessage = "Order status already exists.";
    }

    if (values.indexOf(cleanedValue) !== -1) {
      masterDataMessage.textContent = duplicateMessage;
      return;
    }

    if (!masterDataTablesReady) {
      if (currentProfile && currentProfile.role === "admin") {
        if (type === "location") {
          locations.push(cleanedValue);
        } else {
          orderStatusOptions.push(cleanedValue);
        }
        locations = uniqueValues(locations);
        orderStatusOptions = uniqueValues(orderStatusOptions);
        saveLegacyMasterData();
        refreshManagedOptions();
        setMasterDataStatusMessage("Saved only in this browser. Run supabase-master-data.sql to make master data shared for everyone.");
        showToast("Saved in local fallback only.");
      } else {
        setMasterDataStatusMessage();
      }
      return;
    }

    response = await supabaseClient
      .from(getMasterDataTableName(type))
      .upsert({ value: cleanedValue, active: true }, { onConflict: "value" });

    if (response.error) {
      masterDataMessage.textContent = response.error.message;
      return;
    }

    await loadMasterDataFromSupabase();
    refreshUi();
    masterDataMessage.textContent = "Master data updated.";
    showToast("Master data updated.");
  }

  async function removeMasterDataValue(type, value) {
    var response;

    if (!masterDataTablesReady) {
      if (type === "location") {
        locations = locations.filter(function (item) { return item !== value; });
      } else if (type === "status") {
        orderStatusOptions = orderStatusOptions.filter(function (item) { return item !== value; });
      }
      saveLegacyMasterData();
      refreshManagedOptions();
      setMasterDataStatusMessage("Removed only in this browser. Run supabase-master-data.sql to make master data shared for everyone.");
      showToast("Removed in local fallback only.");
      return;
    }

    response = await supabaseClient
      .from(getMasterDataTableName(type))
      .delete()
      .eq(type === "buyer" ? "code" : "value", value);

    if (response.error) {
      masterDataMessage.textContent = response.error.message;
      return;
    }

    await loadMasterDataFromSupabase();
    refreshUi();
    masterDataMessage.textContent = "Master data updated.";
    showToast("Master data updated.");
  }

  function beginLoading(message) {
    loadingCount += 1;
    if (message) {
      boardMessage.textContent = message;
    }
  }

  function endLoading(successMessage) {
    loadingCount = Math.max(0, loadingCount - 1);
    if (!loadingCount && successMessage) {
      showToast(successMessage);
    }
  }

  function setStaticOptions() {
    setSelectOptions(auditActionFilter, "All actions", [
      { value: "INSERT", label: "INSERT" },
      { value: "UPDATE", label: "UPDATE" },
      { value: "DELETE", label: "DELETE" }
    ]);
    refreshManagedOptions();
    setMasterDataStatusMessage();
    syncSalesAppointmentDateLimit();
    locationSelect.value = locations[0];
    syncBuyerNameFromCode();
    orderStatusSelect.value = orderStatusOptions[0];
    dispatchStatusSelect.value = "Pending";
  }

  function getTodayDateString() {
    var today = new Date();
    var month = String(today.getMonth() + 1);
    var day = String(today.getDate());
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    return today.getFullYear() + "-" + month + "-" + day;
  }

  function formatDateForInput(dateValue) {
    var month = String(dateValue.getMonth() + 1);
    var day = String(dateValue.getDate());
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    return dateValue.getFullYear() + "-" + month + "-" + day;
  }

  function getMinimumSalesAppointmentDate() {
    var minimumDate = new Date();
    minimumDate.setDate(minimumDate.getDate() + 2);
    return formatDateForInput(minimumDate);
  }

  function getMaximumSalesAppointmentDate() {
    var maximumDate = new Date();
    maximumDate.setDate(maximumDate.getDate() + 60);
    return formatDateForInput(maximumDate);
  }

  function isSpecialSalesAppointmentDate(dateValue) {
    return dateValue === "2027-12-28" ||
      dateValue === "2027-12-29" ||
      dateValue === "2027-12-30" ||
      dateValue === "2027-12-31";
  }

  function syncSalesAppointmentDateLimit() {
    appointmentDateInput.min = currentProfile && currentProfile.role === "admin"
      ? ""
      : getMinimumSalesAppointmentDate();
    appointmentDateInput.max = "";
  }

  function isSalesAppointmentDateAllowed(dateValue) {
    if (currentProfile && currentProfile.role === "admin") {
      return !!dateValue;
    }
    return !!dateValue && (
      isSpecialSalesAppointmentDate(dateValue) ||
      (dateValue >= getMinimumSalesAppointmentDate() && dateValue <= getMaximumSalesAppointmentDate())
    );
  }

  function getSalesDateRestrictionMessage() {
    if (currentProfile && currentProfile.role === "admin") {
      return "";
    }
    return "Sales can create or update orders only from " + getMinimumSalesAppointmentDate() + " to " + getMaximumSalesAppointmentDate() + ", except 2027-12-28 to 2027-12-31.";
  }

  function validateManagedSalesValues(payload) {
    var buyer = getBuyerByCode(payload.buyer_code);
    if (!buyer) {
      return "Buyer Code must be selected from the approved list.";
    }
    if (payload.buyer_name !== buyer.value) {
      return "Buyer Name must match the selected Buyer Code.";
    }
    if (locations.indexOf(payload.location) === -1) {
      return "Location must be selected from App Lists.";
    }
    if (orderStatusOptions.indexOf(payload.order_status) === -1) {
      return "Order Status must be selected from App Lists.";
    }
    return "";
  }

  function formatIndiaDateTime(value) {
    if (!value) {
      return "";
    }

    var dateValue = new Date(value);
    if (isNaN(dateValue.getTime())) {
      return String(value);
    }

    return dateValue.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }) + " IST";
  }

  function csvEscape(value) {
    var text = String(value == null ? "" : value);
    if (text.indexOf('"') !== -1) {
      text = text.replace(/"/g, '""');
    }
    if (/[",\n]/.test(text)) {
      text = '"' + text + '"';
    }
    return text;
  }

  function downloadCsv(filename, headers, rows) {
    var csv = [headers.map(csvEscape).join(",")];
    var i;
    for (i = 0; i < rows.length; i += 1) {
      csv.push(rows[i].map(csvEscape).join(","));
    }
    var blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var current = "";
    var inQuotes = false;
    var i;
    var char;

    for (i = 0; i < text.length; i += 1) {
      char = text.charAt(i);
      if (inQuotes) {
        if (char === '"') {
          if (text.charAt(i + 1) === '"') {
            current += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current);
        current = "";
      } else if (char === "\n") {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      } else if (char !== "\r") {
        current += char;
      }
    }

    if (current.length || row.length) {
      row.push(current);
      rows.push(row);
    }

    return rows;
  }

  function uniqueValues(list) {
    var seen = {};
    var result = [];
    var i;
    for (i = 0; i < list.length; i += 1) {
      if (list[i] && !seen[list[i]]) {
        seen[list[i]] = true;
        result.push(list[i]);
      }
    }
    result.sort();
    return result;
  }

  function isFcWorkflowRole(role) {
    return role === "fc" || role === "fc admin";
  }

  function getAllowedLocations() {
    if (!currentProfile) return [];
    if (currentProfile.role === "fc admin") return locations.slice();
    if (currentProfile.role !== "fc") return locations.slice();
    return uniqueValues(fcAccess.map(function (row) { return row.location; }));
  }

  function badgeClass(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, "-");
  }

  function hasValue(value) {
    return value !== null && value !== undefined && String(value) !== "";
  }

  function isPicklistPending(order) {
    return !hasValue(order.picklist_number) || Number(order.picklist_number) === 0;
  }

  function hasCommittedPicklist(order) {
    return !!order && hasValue(order.picklist_number) && Number(order.picklist_number) !== 0;
  }

  function isDuplicatePicklistExempt(value) {
    var normalized = String(value || "").trim();
    return normalized === "1" || normalized === "2" || normalized === "3" || normalized === "4" || normalized === "5";
  }

  function normalizeOrder(order) {
    return {
      id: order.id,
      appointment_date: order.appointment_date ? String(order.appointment_date).slice(0, 10) : "",
      buyer_code: order.buyer_code,
      buyer_name: order.buyer_name || "",
      order_number: order.order_number || "",
      order_status: order.order_status || "",
      location: order.location || "",
      appointment_id: order.appointment_id || "",
      max_qty: order.max_qty,
      time_slot: order.time_slot ? String(order.time_slot).slice(0, 5) : "",
      status: order.status || "",
      picklist_number: order.picklist_number,
      picklist_qty: order.picklist_qty,
      vehicle_number: order.vehicle_number || "",
      vehicle_type: order.vehicle_type || "",
      boxes: order.boxes,
      created_by_user: order.created_by_user || "",
      last_updated_by_user: order.last_updated_by_user || "",
      updated_at: order.updated_at || "",
      sales_entry_timestamp: order.sales_entry_timestamp || "",
      dispatch_status: order.dispatch_status || "Pending",
      deleted_at: order.deleted_at || "",
      deleted_by_user: order.deleted_by_user || ""
    };
  }

  function normalizeAuditEntry(entry) {
    return {
      id: entry.id,
      order_id: entry.order_id || "",
      action: entry.action || "",
      changed_by_user: entry.changed_by_user || "",
      changed_at: entry.changed_at || "",
      row_before: entry.row_before || null,
      row_after: entry.row_after || null
    };
  }

  function getAuditOrderSnapshot(entry) {
    return entry.row_after || entry.row_before || {};
  }

  function getAuditOrderNumber(entry) {
    var snapshot = getAuditOrderSnapshot(entry);
    return snapshot.order_number || "";
  }

  function getAuditBuyerName(entry) {
    var snapshot = getAuditOrderSnapshot(entry);
    return snapshot.buyer_name || "";
  }

  function getAuditChangedFields(entry) {
    var before = entry.row_before || {};
    var after = entry.row_after || {};
    var keys = {};
    var changed = [];

    Object.keys(before).forEach(function (key) {
      keys[key] = true;
    });
    Object.keys(after).forEach(function (key) {
      keys[key] = true;
    });

    Object.keys(keys).forEach(function (key) {
      if (String(before[key]) !== String(after[key])) {
        changed.push(key);
      }
    });

    return changed;
  }

  function formatAuditSummary(entry) {
    var changedFields;

    if (entry.action === "INSERT") {
      return "Order created";
    }
    if (entry.action === "DELETE") {
      return "Order deleted";
    }

    changedFields = getAuditChangedFields(entry)
      .filter(function (field) {
        return field !== "updated_at";
      })
      .slice(0, 4);

    if (!changedFields.length) {
      return "Record updated";
    }

    return "Updated: " + changedFields.join(", ");
  }

  async function loadAuditHistory() {
    var response;

    auditEntries = [];
    auditTablesReady = false;

    if (!currentProfile || currentProfile.role !== "admin") {
      return;
    }

    response = await supabaseClient
      .from("order_audit_log")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(500);

    if (response.error) {
      auditHistoryMessage.textContent = "Audit history is not ready yet. Run supabase-phase-upgrades.sql in Supabase to enable it.";
      return;
    }

    auditEntries = (response.data || []).map(normalizeAuditEntry);
    auditTablesReady = true;
  }

  function getVisibleAuditEntries() {
    var action = auditActionFilter ? auditActionFilter.value : "";
    var changedDate = auditDateFilter ? auditDateFilter.value : "";
    var query = String(auditSearchInput && auditSearchInput.value ? auditSearchInput.value : "").toLowerCase();

    return auditEntries.filter(function (entry) {
      var searchable = [
        getAuditOrderNumber(entry),
        getAuditBuyerName(entry),
        entry.changed_by_user,
        entry.order_id,
        formatAuditSummary(entry)
      ].join(" ").toLowerCase();

      if (action && entry.action !== action) {
        return false;
      }
      if (changedDate && String(entry.changed_at || "").slice(0, 10) !== changedDate) {
        return false;
      }
      if (query && searchable.indexOf(query) === -1) {
        return false;
      }
      return true;
    });
  }

  function renderAuditHistory() {
    var visibleEntries;
    var dateOptions;
    var selectedDate;
    var html = "";

    if (!auditHistoryBody || !auditHistoryMessage) {
      return;
    }

    if (!currentProfile || currentProfile.role !== "admin") {
      auditHistoryBody.innerHTML = '<tr class="empty-state-row"><td colspan="6">Audit history is available for Admin only.</td></tr>';
      auditHistoryMessage.textContent = "";
      return;
    }

    if (!auditTablesReady) {
      auditHistoryBody.innerHTML = '<tr class="empty-state-row"><td colspan="6">Run supabase-phase-upgrades.sql to enable audit history.</td></tr>';
      if (!auditHistoryMessage.textContent) {
        auditHistoryMessage.textContent = "Audit history is not ready yet. Run supabase-phase-upgrades.sql in Supabase.";
      }
      return;
    }

    selectedDate = auditDateFilter.value;
    dateOptions = uniqueValues(auditEntries.map(function (entry) {
      return String(entry.changed_at || "").slice(0, 10);
    })).sort().reverse();
    setSelectOptions(auditDateFilter, "All change dates", dateOptions.map(function (value) {
      return { value: value, label: value };
    }));
    if (dateOptions.indexOf(selectedDate) !== -1) {
      auditDateFilter.value = selectedDate;
    }

    visibleEntries = getVisibleAuditEntries();

    if (!visibleEntries.length) {
      auditHistoryBody.innerHTML = '<tr class="empty-state-row"><td colspan="6">No audit entries match the current filters.</td></tr>';
      auditHistoryMessage.textContent = auditEntries.length ? "No matching audit entries." : "No audit entries yet.";
      return;
    }

    visibleEntries.forEach(function (entry) {
      var orderNumber = getAuditOrderNumber(entry);
      html += "<tr>";
      html += "<td>" + escapeHtml(formatIndiaDateTime(entry.changed_at)) + "</td>";
      html += '<td><span class="badge ' + badgeClass(entry.action) + '">' + escapeHtml(entry.action) + "</span></td>";
      html += "<td>" + (orderNumber ? escapeHtml(orderNumber) : '<span class="muted">Unknown</span>') + "</td>";
      html += "<td>" + (entry.changed_by_user ? escapeHtml(entry.changed_by_user) : '<span class="muted">Unknown</span>') + "</td>";
      html += "<td>" + escapeHtml(formatAuditSummary(entry)) + "</td>";
      html += "<td>" + escapeHtml(entry.order_id) + "</td>";
      html += "</tr>";
    });

    auditHistoryBody.innerHTML = html;
    auditHistoryMessage.textContent = "Showing " + visibleEntries.length + " audit entries.";
  }

  function resetAuditFilters() {
    if (auditActionFilter) {
      auditActionFilter.value = "";
    }
    if (auditDateFilter) {
      auditDateFilter.value = "";
    }
    if (auditSearchInput) {
      auditSearchInput.value = "";
    }
    renderAuditHistory();
  }

  function getCurrentEntryUserLabel() {
    if (currentProfile && currentProfile.full_name) {
      return currentProfile.full_name;
    }
    if (currentSession && currentSession.user && currentSession.user.email) {
      return currentSession.user.email;
    }
    return "";
  }

  function normalizeDispatchReport(report) {
    return {
      id: report.id,
      order_id: report.order_id || "",
      order_number: report.order_number || "",
      appointment_date: report.appointment_date ? String(report.appointment_date).slice(0, 10) : "",
      buyer_code: report.buyer_code || "",
      buyer_name: report.buyer_name || "",
      location: report.location || "",
      dispatched_at: report.dispatched_at || "",
      vehicle_number: report.vehicle_number || "",
      vehicle_type: report.vehicle_type || "",
      boxes: report.boxes,
      dispatch_status: report.dispatch_status || "Dispatched",
      created_by_user: report.created_by_user || ""
    };
  }

  function showSalesError(message) {
    salesUtilityMessage.textContent = message;
    if (message === "Order number already exists. Use Edit Mode to update this order.") {
      window.alert(message);
    }
  }

  function showToast(message) {
    if (!appToast) {
      return;
    }

    appToast.textContent = message;
    appToast.className = "toast";
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      appToast.className = "toast app-hidden";
    }, 2800);
  }

  function isSoftDeleted(order) {
    return !!(order && order.deleted_at);
  }

  function shouldShowDeletedOrders() {
    return !!(currentProfile && currentProfile.role === "admin" && boardShowDeleted && boardShowDeleted.checked);
  }

  async function fetchAllOrders(options) {
    var includeDeleted = !!(options && options.includeDeleted);
    var pageSize = 1000;
    var start = 0;
    var allOrders = [];
    var response;
    var batch;
    var query;

    while (true) {
      query = supabaseClient
        .from("orders")
        .select("*")
        .order("appointment_date", { ascending: false });

      if (!includeDeleted) {
        query = query.is("deleted_at", null);
      }

      response = await query.range(start, start + pageSize - 1);

      if (response.error) {
        return { data: null, error: response.error };
      }

      batch = response.data || [];
      allOrders = allOrders.concat(batch);

      if (batch.length < pageSize) {
        break;
      }

      start += pageSize;
    }

    return { data: allOrders, error: null };
  }

  async function fetchDispatchReports() {
    var response = await supabaseClient
      .from("dispatch_reports")
      .select("*")
      .order("dispatched_at", { ascending: false });

    return {
      data: response.data || [],
      error: response.error || null
    };
  }

  function getVisibleOrders() {
    var scoped = [];
    var allowed = getAllowedLocations();
    var query = String(searchInput.value || "").toLowerCase();
    var appointmentDate = boardAppointmentDateSelect.value;
    var dispatchStatus = boardDispatchStatusSelect.value;
    var buyerName = boardBuyerNameSelect.value;
    var buyerCode = boardBuyerCodeSelect.value;
    var location = boardLocationSelect.value;
    var searchable;
    var i;
    var order;

    for (i = 0; i < orders.length; i += 1) {
      order = orders[i];
      if (isSoftDeleted(order) && !shouldShowDeletedOrders()) {
        continue;
      }
      if (currentProfile && currentProfile.role === "fc" && allowed.indexOf(order.location) === -1) {
        continue;
      }
      searchable = [
        order.order_number,
        order.buyer_code,
        order.buyer_name,
        order.appointment_id,
        order.location
      ].join(" ").toLowerCase();
      if (currentProfile && currentProfile.role !== "sales" && appointmentDate && order.appointment_date !== appointmentDate) {
        continue;
      }
      if (dispatchStatus && order.dispatch_status !== dispatchStatus) {
        continue;
      }
      if (buyerName && order.buyer_name !== buyerName) {
        continue;
      }
      if (buyerCode && String(order.buyer_code) !== buyerCode) {
        continue;
      }
      if (location && order.location !== location) {
        continue;
      }
      if (query && searchable.indexOf(query) === -1) {
        continue;
      }
      scoped.push(order);
    }

    return scoped;
  }

  function getBoardScopedOrders() {
    var allowed = getAllowedLocations();

    return orders.filter(function (order) {
      if (isSoftDeleted(order) && !shouldShowDeletedOrders()) {
        return false;
      }
      if (currentProfile && currentProfile.role === "fc" && allowed.indexOf(order.location) === -1) {
        return false;
      }
      return true;
    });
  }

  function getActiveBoardScopedOrders() {
    var allowed = getAllowedLocations();

    return orders.filter(function (order) {
      if (isSoftDeleted(order)) {
        return false;
      }
      if (currentProfile && currentProfile.role === "fc" && allowed.indexOf(order.location) === -1) {
        return false;
      }
      return true;
    });
  }

  function getAppointmentAgeDays(order) {
    var appointmentDate;
    var today;
    var diff;

    if (!order || !order.appointment_date) {
      return null;
    }

    appointmentDate = new Date(order.appointment_date + "T00:00:00");
    today = new Date(getTodayDateString() + "T00:00:00");
    diff = Math.round((today.getTime() - appointmentDate.getTime()) / 86400000);
    return diff;
  }

  function getAgingBadgeMarkup(order) {
    var age = getAppointmentAgeDays(order);
    var label = age === null ? "N/A" : age + "d";
    var cssClass = "age-future";

    if (age === null) {
      cssClass = "age-future";
    } else if (age >= 4) {
      cssClass = "age-critical";
    } else if (age >= 2) {
      cssClass = "age-warning";
    } else if (age >= 0) {
      cssClass = "age-current";
    }

    return '<span class="badge ' + cssClass + '">' + escapeHtml(label) + "</span>";
  }

  function resetBoardFilters() {
    searchInput.value = "";
    boardAppointmentDateSelect.value = "";
    boardDispatchStatusSelect.value = "";
    boardBuyerNameSelect.value = "";
    boardBuyerCodeSelect.value = "";
    boardLocationSelect.value = "";
    if (boardShowDeleted) {
      boardShowDeleted.checked = false;
    }
    currentPage = 1;
    renderBoardFilters();
    renderTable();
  }

  function refreshBoardView() {
    currentPage = 1;
    renderBoardFilters();
    renderTable();
  }

  function goToPreviousPage() {
    if (currentPage > 1) {
      currentPage -= 1;
      renderTable();
    }
  }

  function goToNextPage() {
    currentPage += 1;
    renderTable();
  }

  function resetDashboardFilters() {
    dashboardLocationAppointmentDate.value = "";
    dashboardBuyerAppointmentDate.value = "";
    renderDashboard();
  }

  function getDashboardOrders() {
    return getActiveBoardScopedOrders();
  }

  function countPendingDispatchOrders(orderList) {
    return orderList.filter(function (order) {
      return hasCommittedPicklist(order) && order.dispatch_status !== "Dispatched";
    }).length;
  }

  function countTodayOrders(orderList) {
    var today = getTodayDateString();
    return orderList.filter(function (order) {
      return order.appointment_date === today;
    }).length;
  }

  function buildGroupedSummary(orderList, keyName) {
    var grouped = {};
    var keys = [];

    orderList.forEach(function (order) {
      var key = order[keyName] || "Not Set";
      if (!grouped[key]) {
        grouped[key] = {
          key: key,
          total: 0,
          pendingPicklist: 0,
          pendingDispatch: 0,
          dispatched: 0
        };
        keys.push(key);
      }

      grouped[key].total += 1;
      if (isPicklistPending(order)) {
        grouped[key].pendingPicklist += 1;
      }
      if (hasCommittedPicklist(order) && order.dispatch_status !== "Dispatched") {
        grouped[key].pendingDispatch += 1;
      }
      if (order.dispatch_status === "Dispatched") {
        grouped[key].dispatched += 1;
      }
    });

    keys.sort();
    return keys.map(function (key) { return grouped[key]; });
  }

  function createDashboardCard(label, value, note) {
    return '<div class="dashboard-card"><strong>' + escapeHtml(String(value)) + '</strong><span>' + escapeHtml(label) + '</span><small>' + escapeHtml(note) + '</small></div>';
  }

  function renderSummaryTableRows(target, rows, emptyLabel) {
    var html = "";

    if (!rows.length) {
      target.innerHTML = '<tr class="empty-state-row"><td colspan="5">' + escapeHtml(emptyLabel) + "</td></tr>";
      return;
    }

    rows.forEach(function (row) {
      html += "<tr>";
      html += "<td>" + escapeHtml(row.key) + "</td>";
      html += "<td>" + escapeHtml(row.total) + "</td>";
      html += "<td>" + escapeHtml(row.pendingPicklist) + "</td>";
      html += "<td>" + escapeHtml(row.pendingDispatch) + "</td>";
      html += "<td>" + escapeHtml(row.dispatched) + "</td>";
      html += "</tr>";
    });

    target.innerHTML = html;
  }

  function exportCustomReport(filename, rows) {
    downloadCsv(filename,
      ["appointmentDate", "buyerCode", "buyerName", "orderNumber", "orderStatus", "location", "appointmentId", "picklistNumber", "picklistQty", "vehicleNumber", "boxes", "dispatchStatus", "lastUpdatedBy", "lastUpdatedAt"],
      rows.map(function (order) {
        return [
          order.appointment_date,
          order.buyer_code,
          order.buyer_name,
          order.order_number,
          order.order_status,
          order.location,
          order.appointment_id,
          order.picklist_number,
          order.picklist_qty,
          order.vehicle_number,
          order.boxes,
          order.dispatch_status,
          order.last_updated_by_user,
          formatIndiaDateTime(order.updated_at)
        ];
      })
    );
  }

  function exportPendingPicklistReport() {
    exportCustomReport("pending-picklist-report.csv", getActiveBoardScopedOrders().filter(function (order) {
      return isPicklistPending(order);
    }));
    showToast("Pending picklist report exported.");
  }

  function exportPendingDispatchReport() {
    exportCustomReport("pending-dispatch-report.csv", getActiveBoardScopedOrders().filter(function (order) {
      return hasCommittedPicklist(order) && order.dispatch_status !== "Dispatched";
    }));
    showToast("Pending dispatch report exported.");
  }

  function exportDispatchedTodayReport() {
    var today = getTodayDateString();
    exportCustomReport("dispatched-today-report.csv", getActiveBoardScopedOrders().filter(function (order) {
      return order.dispatch_status === "Dispatched" && order.appointment_date === today;
    }));
    showToast("Dispatched today report exported.");
  }

  function renderDashboard() {
    var dashboardOrders = getDashboardOrders();
    var selectedLocationDate = dashboardLocationAppointmentDate.value;
    var selectedBuyerDate = dashboardBuyerAppointmentDate.value;
    var totalOrdersCount = dashboardOrders.length;
    var pendingPicklistCount = dashboardOrders.filter(function (order) {
      return isPicklistPending(order);
    }).length;
    var pendingDispatchCount = countPendingDispatchOrders(dashboardOrders);
    var dispatchedCount = dashboardOrders.filter(function (order) {
      return order.dispatch_status === "Dispatched";
    }).length;
    var todayOrdersCount = countTodayOrders(dashboardOrders);
    var locationDateOptions = uniqueValues(dashboardOrders.map(function (order) {
      return order.appointment_date;
    })).sort();
    var buyerDateOptions = uniqueValues(dashboardOrders.map(function (order) {
      return order.appointment_date;
    })).sort();
    var locationScopedOrders;
    var byLocation;
    var buyerScopedOrders;
    var byBuyer;

    setSelectOptions(dashboardLocationAppointmentDate, "All appointment dates", locationDateOptions.map(function (value) {
      return { value: value, label: value };
    }));
    setSelectOptions(dashboardBuyerAppointmentDate, "All appointment dates", buyerDateOptions.map(function (value) {
      return { value: value, label: value };
    }));

    if (locationDateOptions.indexOf(selectedLocationDate) !== -1) {
      dashboardLocationAppointmentDate.value = selectedLocationDate;
    } else {
      selectedLocationDate = "";
    }
    if (buyerDateOptions.indexOf(selectedBuyerDate) !== -1) {
      dashboardBuyerAppointmentDate.value = selectedBuyerDate;
    } else {
      selectedBuyerDate = "";
    }

    locationScopedOrders = selectedLocationDate
      ? dashboardOrders.filter(function (order) {
          return order.appointment_date === selectedLocationDate;
        })
      : dashboardOrders;
    buyerScopedOrders = selectedBuyerDate
      ? dashboardOrders.filter(function (order) {
          return order.appointment_date === selectedBuyerDate;
        })
      : dashboardOrders;

    byLocation = buildGroupedSummary(locationScopedOrders, "location");
    byBuyer = buildGroupedSummary(buyerScopedOrders, "buyer_name");

    dashboardStats.innerHTML =
      createDashboardCard("Scoped Orders", totalOrdersCount, "Orders visible for your role") +
      createDashboardCard("Pending Picklist", pendingPicklistCount, "Orders still waiting for picklist") +
      createDashboardCard("Pending Dispatch", pendingDispatchCount, "Picklist done, dispatch pending") +
      createDashboardCard("Dispatched", dispatchedCount, "Completed dispatch orders") +
      createDashboardCard("Today Orders", todayOrdersCount, "Orders for today's appointment date");

    renderSummaryTableRows(dashboardByLocationBody, byLocation, "No location summary available.");
    renderSummaryTableRows(dashboardByBuyerBody, byBuyer, "No buyer summary available.");

  }

  function renderBoardFilters() {
    var boardOrders = getBoardScopedOrders();
    var appointmentDate = boardAppointmentDateSelect.value;
    var dispatchStatus = boardDispatchStatusSelect.value;
    var buyerName = boardBuyerNameSelect.value;
    var buyerCode = boardBuyerCodeSelect.value;
    var location = boardLocationSelect.value;
    var appointmentDateOptions = uniqueValues(boardOrders.map(function (order) {
      return order.appointment_date;
    })).sort();
    var dispatchScopedOrders;
    var buyerNameScopedOrders;
    var buyerCodeScopedOrders;
    var locationScopedOrders;
    var dispatchOptions;
    var buyerNameOptions;
    var buyerCodeOptions;
    var locationOptions;

    dispatchScopedOrders = appointmentDate
      ? boardOrders.filter(function (order) {
          return order.appointment_date === appointmentDate;
        })
      : boardOrders;

    dispatchOptions = uniqueValues(dispatchScopedOrders.map(function (order) {
      return order.dispatch_status;
    }));

    if (dispatchOptions.indexOf(dispatchStatus) === -1) {
      dispatchStatus = "";
    }

    buyerNameScopedOrders = dispatchScopedOrders.filter(function (order) {
      return !dispatchStatus || order.dispatch_status === dispatchStatus;
    });

    buyerNameOptions = uniqueValues(buyerNameScopedOrders.map(function (order) {
      return order.buyer_name;
    }));

    if (buyerNameOptions.indexOf(buyerName) === -1) {
      buyerName = "";
    }

    buyerCodeScopedOrders = buyerNameScopedOrders.filter(function (order) {
      return !buyerName || order.buyer_name === buyerName;
    });

    buyerCodeOptions = uniqueValues(buyerCodeScopedOrders.map(function (order) {
      return String(order.buyer_code);
    }));

    if (buyerCodeOptions.indexOf(buyerCode) === -1) {
      buyerCode = "";
    }

    locationScopedOrders = buyerCodeScopedOrders.filter(function (order) {
      return !buyerCode || String(order.buyer_code) === buyerCode;
    });

    locationOptions = uniqueValues(locationScopedOrders.map(function (order) {
      return order.location;
    }));

    setSelectOptions(boardAppointmentDateSelect, "All appointment dates", appointmentDateOptions.map(function (value) {
      return { value: value, label: value };
    }));
    setSelectOptions(boardDispatchStatusSelect, "All dispatch status", dispatchOptions.map(function (value) {
      return { value: value, label: value };
    }));
    setSelectOptions(boardBuyerNameSelect, "All buyer names", buyerNameOptions.map(function (value) {
      return { value: value, label: value };
    }));
    setSelectOptions(boardBuyerCodeSelect, "All buyer codes", buyerCodeOptions.map(function (value) {
      return { value: value, label: value };
    }));
    setSelectOptions(boardLocationSelect, "All locations", locationOptions.map(function (value) {
      return { value: value, label: value };
    }));

    if (appointmentDateOptions.indexOf(appointmentDate) !== -1) {
      boardAppointmentDateSelect.value = appointmentDate;
    }
    if (dispatchOptions.indexOf(dispatchStatus) !== -1) {
      boardDispatchStatusSelect.value = dispatchStatus;
    }
    if (buyerNameOptions.indexOf(buyerName) !== -1) {
      boardBuyerNameSelect.value = buyerName;
    }
    if (buyerCodeOptions.indexOf(buyerCode) !== -1) {
      boardBuyerCodeSelect.value = buyerCode;
    }
    if (locationOptions.indexOf(location) !== -1) {
      boardLocationSelect.value = location;
    } else {
      boardLocationSelect.value = "";
    }
  }

  function getDispatchPages() {
    return {
      dashboard: dashboardPanel,
      sales: salesPanel,
      ops: opsPanel,
      fc: fcPanel,
      board: boardPanel,
      admin: adminPanel
    };
  }

  function getUserInitials(name) {
    var words = String(name || "Dispatch Flow").trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      return "DF";
    }
    return words.slice(0, 2).map(function (word) {
      return word.charAt(0).toUpperCase();
    }).join("");
  }

  function syncWorkspaceIdentity() {
    var name = currentProfile ? currentProfile.full_name : currentSession && currentSession.user ? currentSession.user.email : "Dispatch user";
    var role = currentProfile ? (roleLabels[currentProfile.role] || "Dispatch user") : "Operations workspace";
    var initials = getUserInitials(name);
    var dateLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short" }).format(new Date());

    if (topbarUserName) { topbarUserName.textContent = name || "Dispatch user"; }
    if (topbarUserRole) { topbarUserRole.textContent = role; }
    if (sidebarProfileName) { sidebarProfileName.textContent = name || "Dispatch user"; }
    if (sidebarProfileRole) { sidebarProfileRole.textContent = role; }
    if (topbarAvatar) { topbarAvatar.textContent = initials; }
    if (sidebarAvatar) { sidebarAvatar.textContent = initials; }
    if (topbarDate) { topbarDate.textContent = dateLabel + " · Operations workspace"; }
  }

  function syncWorkspaceNavigation() {
    var pages = getDispatchPages();
    var pageName = activeDispatchPage;
    var available;

    if (!pages[pageName] || pages[pageName].classList.contains("app-hidden")) {
      pageName = "dashboard";
      activeDispatchPage = pageName;
    }

    Object.keys(pages).forEach(function (key) {
      pages[key].classList.toggle("nav-page-hidden", key !== pageName);
    });

    if (dispatchHero) {
      dispatchHero.classList.toggle("nav-page-hidden", pageName !== "dashboard");
    }

    Array.prototype.forEach.call(dispatchNavButtons, function (button) {
      var target = button.getAttribute("data-dispatch-page");
      available = !!pages[target] && !pages[target].classList.contains("app-hidden");
      button.hidden = !available;
      button.classList.toggle("active", target === pageName);
    });
  }

  function setActiveDispatchPage(pageName) {
    var pages = getDispatchPages();

    if (!pages[pageName] || pages[pageName].classList.contains("app-hidden")) {
      return;
    }

    activeDispatchPage = pageName;
    syncWorkspaceNavigation();

    if (dispatchSidebar) {
      dispatchSidebar.classList.remove("sidebar-open");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderRolePanels() {
    var role = currentProfile ? currentProfile.role : "";
    var isAdmin = role === "admin";
    adminPanel.className = isAdmin ? "panel wide-panel role-panel" : "panel wide-panel role-panel app-hidden";
    salesPanel.className = (role === "sales" || isAdmin) ? "panel role-panel" : "panel role-panel app-hidden";
    opsPanel.className = (role === "ops" || isAdmin) ? "panel role-panel" : "panel role-panel app-hidden";
    fcPanel.className = (isFcWorkflowRole(role) || isAdmin) ? "panel role-panel" : "panel role-panel app-hidden";

    currentUserName.textContent = currentProfile ? currentProfile.full_name : "";
    currentUserRole.textContent = currentProfile ? roleLabels[currentProfile.role] : "";
    roleDescription.textContent = currentProfile ? roleDescriptions[currentProfile.role] : "";
    currentUserAccess.textContent = currentProfile && currentProfile.role === "fc"
      ? "Locations: " + getAllowedLocations().join(", ")
      : currentProfile && currentProfile.role === "fc admin"
      ? "Locations: All"
      : currentProfile && isAdmin ? "Access: Admin, Sales Team, Ops Team, FC Team"
      : currentProfile ? "Access: " + roleLabels[currentProfile.role] : "";
    if (userFormMessage) {
      userFormMessage.textContent = currentProfile && currentProfile.role === "admin"
        ? "Create and manage users from Supabase Authentication and profiles tables."
        : "";
    }

    if (boardAppointmentDateSelect) {
      boardAppointmentDateSelect.disabled = role === "sales";
      if (role === "sales") {
        boardAppointmentDateSelect.value = "";
      }
    }

    if (boardShowDeleted) {
      boardShowDeleted.disabled = !isAdmin;
      if (!isAdmin) {
        boardShowDeleted.checked = false;
      }
    }

    syncSalesAppointmentDateLimit();
    syncWorkspaceIdentity();
    syncWorkspaceNavigation();
  }

  function renderMetrics() {
    totalOrders.textContent = String(orders.length);
    readyOrders.textContent = String(orders.filter(function (order) {
      return order.dispatch_status === "Dispatched";
    }).length);
  }

  function renderTable() {
    var visible = getVisibleOrders();
    var pageSize = Number(pageSizeSelect.value || 50);
    var totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
    var pagedVisible;
    var isAdmin = currentProfile && currentProfile.role === "admin";
    var isOps = currentProfile && currentProfile.role === "ops";
    var isSales = currentProfile && currentProfile.role === "sales";
    var html = "";
    var i;
    var order;

    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    pagedVisible = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    paginationLabel.textContent = "Page " + currentPage + " of " + totalPages;
    previousPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;
    for (i = 0; i < pagedVisible.length; i += 1) {
      order = pagedVisible[i];
      html += "<tr>";
      html += "<td>" + escapeHtml(order.appointment_date) + "</td>";
      html += "<td>" + getAgingBadgeMarkup(order) + "</td>";
      html += "<td>" + escapeHtml(order.buyer_code) + "</td>";
      html += "<td>" + escapeHtml(order.buyer_name) + "</td>";
      html += '<td><button type="button" class="order-link-btn" data-order-id="' + escapeHtml(order.id) + '">' + escapeHtml(order.order_number) + "</button></td>";
      html += '<td><span class="badge ' + badgeClass(order.order_status) + '">' + escapeHtml(order.order_status) + "</span></td>";
      html += "<td>" + escapeHtml(order.location) + "</td>";
      html += "<td>" + escapeHtml(order.appointment_id) + "</td>";
      html += "<td>" + escapeHtml(order.max_qty) + "</td>";
      html += "<td>" + escapeHtml(order.time_slot) + "</td>";
      html += '<td><span class="badge ' + badgeClass(order.status) + '">' + escapeHtml(order.status) + "</span></td>";
      html += "<td>";
      if ((isAdmin || isOps) && !isSoftDeleted(order)) {
        html += '<button type="button" class="picklist-link-btn" data-order-id="' + escapeHtml(order.id) + '">';
        html += hasValue(order.picklist_number) && Number(order.picklist_number) !== 0 ? escapeHtml(order.picklist_number) : "Pending";
        html += "</button>";
      } else {
        html += hasValue(order.picklist_number) && Number(order.picklist_number) !== 0 ? escapeHtml(order.picklist_number) : '<span class="muted">Pending</span>';
      }
      html += "</td>";
      html += "<td>" + (hasValue(order.picklist_qty) && Number(order.picklist_qty) !== 0 ? escapeHtml(order.picklist_qty) : '<span class="muted">Pending</span>') + "</td>";
      html += "<td>" + (hasValue(order.vehicle_number) ? escapeHtml(order.vehicle_number) : '<span class="muted">Pending</span>') + "</td>";
      html += "<td>" + (hasValue(order.boxes) && Number(order.boxes) > 0 ? escapeHtml(order.boxes) : '<span class="muted">Pending</span>') + "</td>";
      html += "<td>" + (hasValue(order.last_updated_by_user) ? escapeHtml(order.last_updated_by_user) : '<span class="muted">Pending</span>') + "</td>";
      html += "<td>" + (hasValue(order.updated_at) ? escapeHtml(formatIndiaDateTime(order.updated_at)) : '<span class="muted">Pending</span>') + "</td>";
      html += '<td><span class="badge ' + badgeClass(order.dispatch_status) + '">' + escapeHtml(order.dispatch_status) + "</span></td>";
      html += "<td>";
      if (isAdmin) {
        if (isSoftDeleted(order)) {
          html += '<div class="button-row table-action-row">';
          html += '<button type="button" class="table-btn restore-order-btn" data-order-id="' + escapeHtml(order.id) + '">Restore</button>';
          html += '<button type="button" class="table-btn danger-btn purge-order-btn" data-order-id="' + escapeHtml(order.id) + '">Delete Permanently</button>';
          html += "</div>";
        } else {
          html += '<button type="button" class="table-btn danger-btn delete-order-btn" data-order-id="' + escapeHtml(order.id) + '">Delete</button>';
        }
      } else if (isSales && !isSoftDeleted(order) && isPicklistPending(order)) {
        html += '<button type="button" class="table-btn danger-btn delete-order-btn" data-order-id="' + escapeHtml(order.id) + '">Delete</button>';
      } else {
        html += '<span class="muted">Admin only</span>';
      }
      html += "</td>";
      html += "</tr>";
    }
    if (!html) {
      html = '<tr class="empty-state-row"><td colspan="19">No matching dispatch records found.</td></tr>';
    }
    tableBody.innerHTML = html;
    if (boardMessage && (boardMessage.textContent === "Order deleted." || boardMessage.textContent === "Order restored.")) {
      boardMessage.textContent = "";
    }
  }

  async function deleteOrder(orderId) {
    var response;
    var order;

    if (!currentProfile || (currentProfile.role !== "admin" && currentProfile.role !== "sales")) {
      return;
    }

    order = orders.find(function (item) {
      return String(item.id) === String(orderId);
    });

    if (!order) {
      boardMessage.textContent = "Order not found.";
      return;
    }

    if (currentProfile.role === "sales" && !isPicklistPending(order)) {
      boardMessage.textContent = "Sales Team can delete only orders with pending picklist.";
      return;
    }

    response = await supabaseClient
      .from("orders")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by_user: getCurrentEntryUserLabel(),
        last_updated_by_user: getCurrentEntryUserLabel(),
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (response.error) {
      boardMessage.textContent = response.error.message;
      return;
    }

    boardMessage.textContent = "Order deleted.";
    await loadAppData();
  }

  async function restoreOrder(orderId) {
    var response;

    if (!currentProfile || currentProfile.role !== "admin") {
      return;
    }

    response = await supabaseClient
      .from("orders")
      .update({
        deleted_at: null,
        deleted_by_user: null,
        last_updated_by_user: getCurrentEntryUserLabel(),
        updated_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (response.error) {
      boardMessage.textContent = response.error.message;
      return;
    }

    boardMessage.textContent = "Order restored.";
    await loadAppData();
  }

  async function purgeDeletedOrder(orderId) {
    var response;

    if (!currentProfile || currentProfile.role !== "admin") {
      return;
    }

    response = await supabaseClient
      .from("orders")
      .delete()
      .eq("id", orderId)
      .not("deleted_at", "is", null);

    if (response.error) {
      boardMessage.textContent = response.error.message;
      return;
    }

    boardMessage.textContent = "Order permanently deleted.";
    await loadAppData();
  }

  async function deleteAllOrders() {
    var response;

    if (!currentProfile || currentProfile.role !== "admin") {
      return;
    }

    response = await supabaseClient
      .from("orders")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by_user: getCurrentEntryUserLabel(),
        last_updated_by_user: getCurrentEntryUserLabel(),
        updated_at: new Date().toISOString()
      })
      .is("deleted_at", null);

    if (response.error) {
      userFormMessage.textContent = response.error.message;
      return;
    }

    await loadAppData();
    userFormMessage.textContent = "All active entries deleted.";
  }

  async function deleteAllDispatchedOrders() {
    var response;

    if (!currentProfile || currentProfile.role !== "admin") {
      return;
    }

    response = await supabaseClient
      .from("orders")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by_user: getCurrentEntryUserLabel(),
        last_updated_by_user: getCurrentEntryUserLabel(),
        updated_at: new Date().toISOString()
      })
      .eq("dispatch_status", "Dispatched")
      .is("deleted_at", null);

    if (response.error) {
      userFormMessage.textContent = response.error.message;
      return;
    }

    await loadAppData();
    userFormMessage.textContent = "All dispatched entries deleted.";
  }

  async function purgeSoftDeletedOrders() {
    var response;

    if (!currentProfile || currentProfile.role !== "admin") {
      return;
    }

    response = await supabaseClient
      .from("orders")
      .delete()
      .not("deleted_at", "is", null);

    if (response.error) {
      userFormMessage.textContent = response.error.message;
      return;
    }

    await loadAppData();
    userFormMessage.textContent = "All soft-deleted entries permanently removed.";
  }

  function getSelectedNewUserLocations() {
    if (!newUserLocationChoices) {
      return [];
    }
    return Array.prototype.map.call(
      newUserLocationChoices.querySelectorAll('input[name="newUserLocation"]:checked'),
      function (input) { return input.value; }
    );
  }

  async function getEdgeFunctionErrorMessage(error) {
    var details;
    if (error && error.context && typeof error.context.json === "function") {
      try {
        details = await error.context.json();
        if (details && details.error) {
          return details.error;
        }
      } catch (ignored) {
        // Fall back to the Supabase client error text below.
      }
    }
    return error && error.message ? error.message : "Unable to create the user.";
  }

  async function createDispatchUser(event) {
    var role;
    var locationsForUser;
    var response;
    var errorMessage;

    event.preventDefault();
    if (!currentProfile || currentProfile.role !== "admin") {
      return;
    }

    role = newUserRoleSelect.value;
    locationsForUser = getSelectedNewUserLocations();
    if (["sales", "ops", "fc", "admin"].indexOf(role) === -1) {
      createUserMessage.textContent = "Select a valid role.";
      return;
    }
    if (role === "fc" && !locationsForUser.length) {
      createUserMessage.textContent = "Select at least one FC location for an FC user.";
      return;
    }

    createUserMessage.textContent = "Creating user…";
    createUserButton.disabled = true;
    response = await supabaseClient.functions.invoke("admin-create-user", {
      body: {
        fullName: newUserFullNameInput.value.trim(),
        email: newUserEmailInput.value.trim(),
        password: newUserPasswordInput.value,
        role: role,
        locations: role === "fc" ? locationsForUser : []
      }
    });
    createUserButton.disabled = false;

    if (response.error) {
      errorMessage = await getEdgeFunctionErrorMessage(response.error);
      createUserMessage.textContent = errorMessage;
      return;
    }

    createUserForm.reset();
    renderUserLocationChoices();
    createUserMessage.textContent = "User created. Share the temporary password securely and ask them to reset it after their first sign-in.";
    showToast("Dispatch user created.");
  }

  function openOrderDetails(orderId) {
    var order = orders.find(function (item) {
      return String(item.id) === String(orderId);
    });
    var html = "";
    var fields;

    if (!order) {
      return;
    }

    detailsOrderTitle.textContent = order.order_number || "Dispatch Record";
    fields = [
      ["Appointment Date", order.appointment_date],
      ["Buyer Code", order.buyer_code],
      ["Buyer Name", order.buyer_name],
      ["Order Status", order.order_status],
      ["Location", order.location],
      ["Appointment ID", order.appointment_id],
      ["Max Qty", order.max_qty],
      ["Time Slot", order.time_slot],
      ["Status", order.status],
      ["Picklist Number", hasValue(order.picklist_number) ? order.picklist_number : "Pending"],
      ["Picklist Qty", hasValue(order.picklist_qty) ? order.picklist_qty : "Pending"],
      ["Vehicle Number", hasValue(order.vehicle_number) ? order.vehicle_number : "Pending"],
      ["Vehicle Type", hasValue(order.vehicle_type) ? order.vehicle_type : "Pending"],
      ["Boxes", hasValue(order.boxes) ? order.boxes : "Pending"],
      ["Created By", hasValue(order.created_by_user) ? order.created_by_user : "Pending"],
      ["Sales Entry Time", hasValue(order.sales_entry_timestamp) ? formatIndiaDateTime(order.sales_entry_timestamp) : "Pending"],
      ["Last Updated By", hasValue(order.last_updated_by_user) ? order.last_updated_by_user : "Pending"],
      ["Last Updated At", hasValue(order.updated_at) ? formatIndiaDateTime(order.updated_at) : "Pending"],
      ["Dispatch Status", order.dispatch_status],
      ["Deleted By", hasValue(order.deleted_by_user) ? order.deleted_by_user : "Active"],
      ["Deleted At", hasValue(order.deleted_at) ? formatIndiaDateTime(order.deleted_at) : "Active"]
    ];

    fields.forEach(function (field) {
      html += '<div class="details-item"><span>' + escapeHtml(field[0]) + '</span><strong>' + escapeHtml(field[1]) + "</strong></div>";
    });

    orderDetailsContent.innerHTML = html;
    orderDetailsPanel.className = "details-drawer";
  }

  function closeOrderDetails() {
    orderDetailsPanel.className = "details-drawer app-hidden";
  }

  function resetSalesFormState() {
    currentSalesOrderId = "";
    currentSalesOrderUpdatedAt = "";
    orderForm.reset();
    syncSalesAppointmentDateLimit();
    locationSelect.value = locations[0];
    buyerCodeInput.value = buyerDirectory.length ? buyerDirectory[0].code : "";
    syncBuyerNameFromCode();
    statusSelect.value = "Pending";
    salesPicklistNumberInput.value = "";
    salesPicklistNumberInput.readOnly = false;
    salesOrderSearchInput.value = "";
    salesEditMessage.textContent = "Create a new order or load an existing one to edit Sales fields.";
  }

  function getSalesOrderSearchLabel(order) {
    return order.order_number + " - " + order.buyer_name + " - " + order.appointment_date;
  }

  function resolveSalesOrderSearch(value) {
    var normalizedValue = String(value || "").toLowerCase().trim();

    return orders.find(function (order) {
      return getSalesOrderSearchLabel(order).toLowerCase() === normalizedValue ||
        String(order.order_number || "").toLowerCase() === normalizedValue;
    });
  }

  function loadSalesOrderIntoForm(searchValue) {
    var order = resolveSalesOrderSearch(searchValue);

    if (!order) {
      salesEditMessage.textContent = "Select an existing order to edit.";
      return;
    }

    currentSalesOrderId = order.id;
    currentSalesOrderUpdatedAt = order.updated_at || "";
    appointmentDateInput.value = order.appointment_date || "";
    buyerCodeInput.value = order.buyer_code || "";
    syncBuyerNameFromCode();
    orderNumberInput.value = order.order_number || "";
    orderStatusSelect.value = order.order_status || "Confirmed";
    locationSelect.value = order.location || locations[0];
    appointmentIdInput.value = order.appointment_id || "";
    maxQtyInput.value = order.max_qty || "";
    timeSlotInput.value = order.time_slot || "";
    statusSelect.value = order.status || "Pending";
    salesPicklistNumberInput.value = hasValue(order.picklist_number) && Number(order.picklist_number) !== 0 ? order.picklist_number : "";
    salesPicklistNumberInput.readOnly = hasCommittedPicklist(order) && !(currentProfile && currentProfile.role === "admin");
    salesOrderSearchInput.value = getSalesOrderSearchLabel(order);
    salesEditMessage.textContent = hasCommittedPicklist(order) && !(currentProfile && currentProfile.role === "admin")
      ? "Editing Sales fields for order " + order.order_number + ". Picklist number is locked after Ops update."
      : "Editing Sales fields for order " + order.order_number + ". You can also update the picklist number here.";
  }

  function renderSalesEditor() {
    var selectedOrder = orders.find(function (order) {
      return String(order.id) === String(currentSalesOrderId);
    });
    var html = "";
    var i;

    for (i = 0; i < orders.length; i += 1) {
      html += '<option value="' + escapeHtml(getSalesOrderSearchLabel(orders[i])) + '"></option>';
    }

    salesOrderOptions.innerHTML = html;

    if (selectedOrder) {
      salesOrderSearchInput.value = getSalesOrderSearchLabel(selectedOrder);
    }

    if (!orders.length) {
      salesEditMessage.textContent = "No existing orders yet. Create the first order below.";
    } else if (!currentSalesOrderId && !salesEditMessage.textContent) {
      salesEditMessage.textContent = "Create a new order or load an existing one to edit Sales fields.";
    }
  }

  function renderOpsFilters() {
    var includeExisting = !!opsEditMode;
    var selectedDate = opsAppointmentDateSelect.value;
    var selectedLocation = opsLocationSelect.value;
    var selectedBuyerCode = opsBuyerCodeSelect.value;
    var selectedOrderId = picklistOrderSelect.value;
    var eligibleOrders = orders.filter(function (order) {
      return !isSoftDeleted(order) && order.appointment_date && (includeExisting || isPicklistPending(order));
    });
    var dateOptions = uniqueValues(eligibleOrders.map(function (order) {
      return order.appointment_date;
    }));

    setSelectOptions(opsAppointmentDateSelect, "Choose appointment date", dateOptions.map(function (value) {
      return { value: value, label: value };
    }));
    if (dateOptions.indexOf(selectedDate) !== -1) {
      opsAppointmentDateSelect.value = selectedDate;
    } else {
      selectedDate = "";
    }

    var locationOptions = uniqueValues(eligibleOrders.filter(function (order) {
      return order.appointment_date === selectedDate;
    }).map(function (order) {
      return order.location;
    }));

    setSelectOptions(opsLocationSelect, "Choose location", locationOptions.map(function (value) {
      return { value: value, label: value };
    }));
    if (locationOptions.indexOf(selectedLocation) !== -1) {
      opsLocationSelect.value = selectedLocation;
    } else {
      selectedLocation = "";
    }

    var buyerCodeOptions = uniqueValues(eligibleOrders.filter(function (order) {
      return order.appointment_date === selectedDate &&
        order.location === selectedLocation;
    }).map(function (order) {
      return String(order.buyer_code);
    }));

    setSelectOptions(opsBuyerCodeSelect, "Choose buyer code", buyerCodeOptions.map(function (value) {
      return { value: value, label: value };
    }));
    if (buyerCodeOptions.indexOf(selectedBuyerCode) !== -1) {
      opsBuyerCodeSelect.value = selectedBuyerCode;
    } else {
      selectedBuyerCode = "";
    }

    var matchingOrders = eligibleOrders.filter(function (order) {
      return order.appointment_date === selectedDate &&
        order.location === selectedLocation &&
        String(order.buyer_code) === selectedBuyerCode;
    });
    var orderOptions = matchingOrders.map(function (order) {
      return { value: order.id, label: order.order_number };
    });

    setSelectOptions(picklistOrderSelect, "Choose an order", orderOptions);
    if (orderOptions.map(function (option) { return String(option.value); }).indexOf(String(selectedOrderId)) !== -1) {
      picklistOrderSelect.value = selectedOrderId;
    } else {
      picklistOrderSelect.value = "";
    }

    selectedOpsOrderText.value = "";
    picklistNumberInput.value = "";
    picklistQtyInput.value = "";
    if (picklistOrderSelect.value) {
      var selectedOrder = matchingOrders.find(function (order) {
        return String(order.id) === String(picklistOrderSelect.value);
      });
      if (selectedOrder) {
        selectedOpsOrderText.value = selectedOrder.order_number || "";
        picklistNumberInput.value = hasValue(selectedOrder.picklist_number) ? selectedOrder.picklist_number : "";
        picklistQtyInput.value = hasValue(selectedOrder.picklist_qty) ? selectedOrder.picklist_qty : "";
      }
    }
    if (!orders.length) {
      opsEmptyMessage.textContent = "No orders are available for Ops.";
    } else if (!eligibleOrders.length) {
      opsEmptyMessage.textContent = "All available orders already have picklist details.";
    } else if (!dateOptions.length) {
      opsEmptyMessage.textContent = "No appointment dates are available for the current Ops view.";
    } else if (selectedDate && selectedLocation && selectedBuyerCode && !orderOptions.length) {
      opsEmptyMessage.textContent = includeExisting
        ? "No orders match the current Ops filters."
        : "All orders for this appointment date, location, and buyer already have picklist details.";
    } else {
      opsEmptyMessage.textContent = "";
    }

    if (toggleOpsEditModeButton) {
      toggleOpsEditModeButton.textContent = includeExisting ? "Close Picklist Edit" : "Open Picklist Edit";
    }
  }

  function captureOpsFilterState() {
    return {
      appointmentDate: opsAppointmentDateSelect.value,
      location: opsLocationSelect.value,
      buyerCode: opsBuyerCodeSelect.value,
      includeExisting: !!opsEditMode
    };
  }

  function restoreOpsFilterState(state) {
    if (!state) {
      return;
    }

    opsEditMode = !!state.includeExisting;

    opsAppointmentDateSelect.value = state.appointmentDate || "";
    opsLocationSelect.value = state.location || "";
    opsBuyerCodeSelect.value = state.buyerCode || "";
    picklistOrderSelect.value = "";
    selectedOpsOrderText.value = "";
    picklistNumberInput.value = "";
    picklistQtyInput.value = "";
    renderOpsFilters();
  }

  function openOrderInOps(orderId) {
    var order = orders.find(function (item) {
      return String(item.id) === String(orderId);
    });

    if (!order || isSoftDeleted(order)) {
      boardMessage.textContent = "This order is not available for Ops edit.";
      return;
    }

    if (!currentProfile || (currentProfile.role !== "ops" && currentProfile.role !== "admin")) {
      boardMessage.textContent = "Only Ops Team or Admin can edit picklists from the Live Board.";
      return;
    }

    opsEditMode = !isPicklistPending(order);
    opsPanel.className = "panel role-panel";
    opsAppointmentDateSelect.value = order.appointment_date || "";
    opsLocationSelect.value = order.location || "";
    opsBuyerCodeSelect.value = String(order.buyer_code || "");
    renderOpsFilters();
    picklistOrderSelect.value = order.id;
    selectedOpsOrderText.value = order.order_number || "";
    picklistNumberInput.value = hasValue(order.picklist_number) ? order.picklist_number : "";
    picklistQtyInput.value = hasValue(order.picklist_qty) ? order.picklist_qty : "";
    opsEmptyMessage.textContent = "";
    if (toggleOpsEditModeButton) {
      toggleOpsEditModeButton.textContent = opsEditMode ? "Close Picklist Edit" : "Open Picklist Edit";
    }
    setActiveDispatchPage("ops");
    opsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderFcFilters() {
    var allowed = getAllowedLocations();
    var selectedDate = fcAppointmentDateSelect.value;
    var selectedBuyerCode = fcBuyerCodeSelect.value;
    var dateOptions = uniqueValues(orders.filter(function (order) {
      return allowed.indexOf(order.location) !== -1 &&
        hasValue(order.picklist_number) &&
        Number(order.picklist_number) !== 0;
    }).map(function (order) {
      return order.appointment_date;
    }));

    setSelectOptions(fcAppointmentDateSelect, "Choose appointment date", dateOptions.map(function (value) {
      return { value: value, label: value };
    }));
    if (dateOptions.indexOf(selectedDate) !== -1) {
      fcAppointmentDateSelect.value = selectedDate;
    } else {
      selectedDate = "";
    }

    var buyerCodeOptions = uniqueValues(orders.filter(function (order) {
      return order.appointment_date === selectedDate &&
        allowed.indexOf(order.location) !== -1 &&
        hasValue(order.picklist_number) &&
        Number(order.picklist_number) !== 0;
    }).map(function (order) {
      return String(order.buyer_code);
    }));

    setSelectOptions(fcBuyerCodeSelect, "Choose buyer code", buyerCodeOptions.map(function (value) {
      return { value: value, label: value };
    }));
    if (buyerCodeOptions.indexOf(selectedBuyerCode) !== -1) {
      fcBuyerCodeSelect.value = selectedBuyerCode;
    } else {
      selectedBuyerCode = "";
    }

    var orderOptions = orders.filter(function (order) {
      return order.appointment_date === selectedDate &&
        String(order.buyer_code) === selectedBuyerCode &&
        allowed.indexOf(order.location) !== -1 &&
        hasValue(order.picklist_number) &&
        Number(order.picklist_number) !== 0;
    }).map(function (order) {
      return {
        value: order.id,
        label: order.order_number + " - " + order.buyer_name + " - " + order.location
      };
    });

    setSelectOptions(dispatchOrderSelect, "Choose an order", orderOptions);
  }

  function refreshUi() {
    renderRolePanels();
    renderMetrics();
    renderDashboard();
    renderAuditHistory();
    renderBoardFilters();
    renderTable();
    renderSalesEditor();
    renderOpsFilters();
    renderFcFilters();
  }

  async function loadAppData() {
    if (!currentSession) {
      orders = [];
      currentProfile = null;
      auditEntries = [];
      auditTablesReady = false;
      fcAccess = [];
      await loadMasterDataFromSupabase();
      refreshUi();
      return;
    }

    beginLoading("Loading shared orders...");
    var profileResponse = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentSession.user.id)
      .single();

    if (profileResponse.error || !profileResponse.data) {
      var fallback = fallbackProfilesByEmail[String(currentSession.user.email || "").toLowerCase()];
      if (fallback) {
        currentProfile = {
          id: currentSession.user.id,
          email: currentSession.user.email,
          full_name: fallback.full_name,
          role: fallback.role
        };
      } else {
        currentProfile = null;
        roleDescription.textContent = "Profile not found in Supabase. Please check the profiles table for this user.";
        currentUserName.textContent = currentSession.user.email || "";
        currentUserRole.textContent = "";
        currentUserAccess.textContent = "";
        salesPanel.className = "panel role-panel app-hidden";
        opsPanel.className = "panel role-panel app-hidden";
        fcPanel.className = "panel role-panel app-hidden";
        adminPanel.className = "panel wide-panel role-panel app-hidden";
        syncWorkspaceIdentity();
        syncWorkspaceNavigation();
        loadingCount = 0;
        return;
      }
    } else {
      currentProfile = profileResponse.data;
    }

    await loadMasterDataFromSupabase();
    await loadAuditHistory();

    var ordersResponse = await fetchAllOrders({ includeDeleted: shouldShowDeletedOrders() });
    var dispatchReportsResponse = await fetchDispatchReports();

    if (ordersResponse.error) {
      orders = [];
      opsEmptyMessage.textContent = ordersResponse.error.message;
      refreshUi();
      loadingCount = 0;
      return;
    }

    orders = (ordersResponse.data || []).map(normalizeOrder);
    dispatchReports = dispatchReportsResponse.error ? [] : (dispatchReportsResponse.data || []).map(normalizeDispatchReport);

    if (currentProfile && currentProfile.role === "fc") {
      var accessResponse = await supabaseClient
        .from("fc_location_access")
        .select("location")
        .eq("user_id", currentSession.user.id);
      fcAccess = accessResponse.data && accessResponse.data.length
        ? accessResponse.data
        : [{ location: "Mumbai" }, { location: "Pune" }];
    } else {
      fcAccess = [];
    }

    refreshUi();
    endLoading();
  }

  function updateAuthView() {
    var loggedIn = !!currentSession;
    loginView.className = loggedIn ? "auth-shell app-hidden" : "auth-shell";
    appView.className = loggedIn ? "app-shell" : "app-shell app-hidden";
    if (loggedIn) {
      activeDispatchPage = "dashboard";
      loadAppData();
    }
  }

  async function resetSession() {
    await supabaseClient.auth.signOut();
    currentSession = null;
    currentProfile = null;
    orders = [];
    auditEntries = [];
    auditTablesReady = false;
    fcAccess = [];
    loginMessage.textContent = "Session cleared.";
    updateAuthView();
  }

  async function exportSalesData() {
    var response = await fetchAllOrders();
    var exportOrders;

    if (response.error) {
      salesUtilityMessage.textContent = response.error.message;
      return;
    }

    exportOrders = (response.data || []).map(normalizeOrder);

    downloadCsv("sales-data.csv",
      ["appointmentDate", "buyerCode", "buyerName", "orderNumber", "orderStatus", "location", "appointmentId", "maxQty", "timeSlot", "status"],
      exportOrders.map(function (order) {
        return [
          order.appointment_date,
          order.buyer_code,
          order.buyer_name,
          order.order_number,
          order.order_status,
          order.location,
          order.appointment_id,
          order.max_qty,
          order.time_slot,
          order.status
        ];
      })
    );
    salesUtilityMessage.textContent = "Sales CSV exported.";
    showToast("Sales CSV exported.");
  }

  async function exportAllOrdersData() {
    var response = await fetchAllOrders();
    var exportOrders;

    if (response.error) {
      salesUtilityMessage.textContent = response.error.message;
      return;
    }

    exportOrders = (response.data || []).map(normalizeOrder);

    if (currentProfile && currentProfile.role === "fc") {
      exportOrders = exportOrders.filter(function (order) {
        return getAllowedLocations().indexOf(order.location) !== -1;
      });
    }

    downloadCsv("all-orders.csv",
      ["appointmentDate", "buyerCode", "buyerName", "orderNumber", "orderStatus", "location", "appointmentId", "maxQty", "timeSlot", "status", "picklistNumber", "picklistQty", "vehicleNumber", "vehicleType", "boxes", "createdByUser", "lastUpdatedBy", "lastUpdatedAt", "dispatchStatus"],
      exportOrders.map(function (order) {
        return [
          order.appointment_date,
          order.buyer_code,
          order.buyer_name,
          order.order_number,
          order.order_status,
          order.location,
          order.appointment_id,
          order.max_qty,
          order.time_slot,
          order.status,
          order.picklist_number,
          order.picklist_qty,
          order.vehicle_number,
          order.vehicle_type,
          order.boxes,
          order.created_by_user,
          order.last_updated_by_user,
          formatIndiaDateTime(order.updated_at),
          order.dispatch_status
        ];
      })
    );
    salesUtilityMessage.textContent = "All orders CSV exported.";
    showToast("All orders CSV exported.");
  }

  function downloadOpsTemplate() {
    downloadCsv(
      "ops-import-template.csv",
      ["appointmentDate", "buyerCode", "orderStatus", "orderNumber", "picklistNumber", "picklistQty"],
      [[getTodayDateString(), "100001", "Confirmed", "ORD-1001", "50001", "80"]]
    );
    opsUtilityMessage.textContent = "Ops template downloaded.";
  }

  function exportOpsData() {
    var exportOrders = getActiveBoardScopedOrders();

    downloadCsv(
      "ops-data.csv",
      ["appointmentDate", "buyerCode", "orderStatus", "orderNumber", "picklistNumber", "picklistQty"],
      exportOrders.map(function (order) {
        return [
          order.appointment_date,
          order.buyer_code,
          order.order_status,
          order.order_number,
          order.picklist_number,
          order.picklist_qty
        ];
      })
    );
    opsUtilityMessage.textContent = "Ops CSV exported.";
    showToast("Ops CSV exported.");
  }

  function downloadFcTemplate() {
    downloadCsv(
      "fc-import-template.csv",
      ["appointmentDate", "location", "orderNumber", "vehicleNumber", "vehicleType", "boxes", "dispatchStatus"],
      [[getTodayDateString(), locations[0], "ORD-1001", "MH12AB1234", "17 ft", "10", "Pending"]]
    );
    fcUtilityMessage.textContent = "FC template downloaded.";
  }

  function exportFcData() {
    var visibleOrders = getBoardScopedOrders();

    downloadCsv(
      "fc-data.csv",
      ["appointmentDate", "location", "orderNumber", "vehicleNumber", "vehicleType", "boxes", "dispatchStatus"],
      visibleOrders.map(function (order) {
        return [
          order.appointment_date,
          order.location,
          order.order_number,
          order.vehicle_number,
          order.vehicle_type,
          order.boxes,
          order.dispatch_status
        ];
      })
    );
    fcUtilityMessage.textContent = "FC CSV exported.";
    showToast("FC CSV exported.");
  }

  async function exportDispatchReportData() {
    var response = await fetchDispatchReports();
    var exportRows;

    if (response.error) {
      fcUtilityMessage.textContent = response.error.message;
      return;
    }

    exportRows = (response.data || []).map(normalizeDispatchReport);

    if (currentProfile && currentProfile.role === "fc") {
      exportRows = exportRows.filter(function (row) {
        return getAllowedLocations().indexOf(row.location) !== -1;
      });
    }

    downloadCsv(
      "dispatch-report.csv",
      ["dispatchTimestamp", "orderNumber", "appointmentDate", "buyerCode", "buyerName", "location", "vehicleNumber", "vehicleType", "boxes", "dispatchStatus", "capturedBy"],
      exportRows.map(function (row) {
        return [
          formatIndiaDateTime(row.dispatched_at),
          row.order_number,
          row.appointment_date,
          row.buyer_code,
          row.buyer_name,
          row.location,
          row.vehicle_number,
          row.vehicle_type,
          row.boxes,
          row.dispatch_status,
          row.created_by_user
        ];
      })
    );

    fcUtilityMessage.textContent = "Dispatch report CSV exported.";
    showToast("Dispatch report CSV exported.");
  }

  async function exportBoardData() {
    var response = await fetchAllOrders();
    var exportOrders;

    if (response.error) {
      boardMessage.textContent = response.error.message;
      return;
    }

    exportOrders = (response.data || []).map(normalizeOrder).filter(function (order) {
      return !isSoftDeleted(order);
    });

    if (exportIncludeDispatched && !exportIncludeDispatched.checked) {
      exportOrders = exportOrders.filter(function (order) {
        return order.dispatch_status !== "Dispatched";
      });
    }

    if (currentProfile && currentProfile.role === "fc") {
      exportOrders = exportOrders.filter(function (order) {
        return getAllowedLocations().indexOf(order.location) !== -1;
      });
    }

    downloadCsv("dispatch-board.csv",
      ["appointmentDate", "buyerCode", "buyerName", "orderNumber", "orderStatus", "location", "appointmentId", "maxQty", "timeSlot", "status", "picklistNumber", "picklistQty", "vehicleNumber", "vehicleType", "boxes", "createdByUser", "salesEntryTimestamp", "lastUpdatedBy", "lastUpdatedAt", "dispatchStatus"],
      exportOrders.map(function (order) {
        return [
          order.appointment_date,
          order.buyer_code,
          order.buyer_name,
          order.order_number,
          order.order_status,
          order.location,
          order.appointment_id,
          order.max_qty,
          order.time_slot,
          order.status,
          order.picklist_number,
          order.picklist_qty,
          order.vehicle_number,
          order.vehicle_type,
          order.boxes,
          order.created_by_user,
          formatIndiaDateTime(order.sales_entry_timestamp),
          order.last_updated_by_user,
          formatIndiaDateTime(order.updated_at),
          order.dispatch_status
        ];
      })
    );
    boardMessage.textContent = "Live board CSV exported.";
    showToast("Live board CSV exported.");
  }

  function downloadTemplate() {
    var buyer = buyerDirectory[0] || { code: "", value: "" };
    downloadCsv(
      "sales-import-template.csv",
      ["appointmentDate", "buyerCode", "buyerName", "orderNumber", "orderStatus", "location", "appointmentId", "maxQty", "timeSlot", "status"],
      [[getTodayDateString(), buyer.code, buyer.value, "ORD-1001", "Confirmed", locations[0], "APT-1001", "100", "14:00", "Pending"]]
    );
    salesUtilityMessage.textContent = "Template downloaded.";
  }

  async function saveSalesPayload(payload, orderId) {
    var existingResponse;
    var picklistNumber = hasValue(payload.picklist_number) ? Number(payload.picklist_number) : null;
    var existingOrder = null;
    var salesFields = {
      appointment_date: payload.appointment_date,
      buyer_code: payload.buyer_code,
      buyer_name: payload.buyer_name,
      order_number: payload.order_number,
      order_status: payload.order_status,
      location: payload.location,
      appointment_id: payload.appointment_id,
      max_qty: payload.max_qty,
      time_slot: payload.time_slot,
      status: payload.status,
      last_updated_by_user: getCurrentEntryUserLabel(),
      updated_at: new Date().toISOString()
    };

    if (orderId) {
      existingOrder = orders.find(function (order) {
        return String(order.id) === String(orderId);
      });

      if (existingOrder && currentSalesOrderUpdatedAt && existingOrder.updated_at && existingOrder.updated_at !== currentSalesOrderUpdatedAt) {
        return { error: { message: "This order was updated by another user. Reload it in Edit Mode before saving again." } };
      }

      if (currentProfile && currentProfile.role === "admin" && !hasValue(payload.picklist_number)) {
        salesFields.picklist_number = null;
      } else if (picklistNumber !== null) {
        salesFields.picklist_number = picklistNumber;
      }

      return await supabaseClient
        .from("orders")
        .update(salesFields)
        .eq("id", orderId);
    }

    existingResponse = await supabaseClient
      .from("orders")
      .select("id")
      .eq("order_number", payload.order_number)
      .maybeSingle();

    if (existingResponse.error) {
      return { error: existingResponse.error };
    }

    if (existingResponse.data && existingResponse.data.id) {
      return { error: { message: "Order number already exists. Use Edit Mode to update this order." } };
    }

    salesFields.sales_entry_timestamp = new Date().toISOString();
    salesFields.created_by_user = getCurrentEntryUserLabel();

    return await supabaseClient.from("orders").insert(salesFields);
  }

  async function importSalesCsv(file) {
    var text = await file.text();
    var rows = parseCsv(text);
    var headers;
    var payload = [];
    var row;
    var i;

    if (!rows.length) {
      salesUtilityMessage.textContent = "Import file is empty.";
      return;
    }

    headers = rows[0];
    for (i = 1; i < rows.length; i += 1) {
      row = rows[i];
      if (!row.length || !row[0]) {
        continue;
      }
      payload.push({
        appointment_date: row[headers.indexOf("appointmentDate")] || "",
        buyer_code: row[headers.indexOf("buyerCode")] || "",
        buyer_name: row[headers.indexOf("buyerName")] || "",
        order_number: row[headers.indexOf("orderNumber")] || "",
        order_status: row[headers.indexOf("orderStatus")] || "Confirmed",
        location: row[headers.indexOf("location")] || locations[0],
        appointment_id: row[headers.indexOf("appointmentId")] || "",
        max_qty: Number(row[headers.indexOf("maxQty")] || 0),
        time_slot: row[headers.indexOf("timeSlot")] || "",
        status: row[headers.indexOf("status")] || "Pending"
      });

      row = validateManagedSalesValues(payload[payload.length - 1]);
      if (row) {
        salesUtilityMessage.textContent = row;
        return;
      }

      if (!isSalesAppointmentDateAllowed(payload[payload.length - 1].appointment_date)) {
        salesUtilityMessage.textContent = "CSV import blocked. " + getSalesDateRestrictionMessage();
        return;
      }
    }

    for (i = 0; i < payload.length; i += 1) {
      row = await saveSalesPayload(payload[i]);
      if (row.error) {
        showSalesError(row.error.message);
        return;
      }
    }

    salesUtilityMessage.textContent = payload.length + " rows imported.";
    showToast(payload.length + " sales rows imported.");
    await loadAppData();
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    loginMessage.textContent = "";
    var response = await supabaseClient.auth.signInWithPassword({
      email: document.getElementById("username").value,
      password: document.getElementById("password").value
    });

    if (response.error) {
      loginMessage.textContent = response.error.message;
      return;
    }

    currentSession = response.data.session;
    loginForm.reset();
    updateAuthView();
  });

  resetPasswordButton.addEventListener("click", async function () {
    var email = document.getElementById("username").value;
    var response;

    loginMessage.textContent = "";

    if (!email) {
      loginMessage.textContent = "Enter your email address first, then click Reset Password.";
      return;
    }

    response = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href
    });

    if (response.error) {
      loginMessage.textContent = response.error.message;
      return;
    }

    loginMessage.textContent = "Password reset email sent. Please check your inbox.";
  });

  resetDataButton.addEventListener("click", function () {
    resetSession();
  });

  logoutButton.addEventListener("click", function () {
    resetSession();
  });

  if (topbarLogoutButton) {
    topbarLogoutButton.addEventListener("click", function () {
      resetSession();
    });
  }

  Array.prototype.forEach.call(dispatchNavButtons, function (button) {
    button.addEventListener("click", function () {
      setActiveDispatchPage(button.getAttribute("data-dispatch-page"));
    });
  });

  if (menuToggle && dispatchSidebar) {
    menuToggle.addEventListener("click", function () {
      dispatchSidebar.classList.toggle("sidebar-open");
    });
  }

  orderForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    salesUtilityMessage.textContent = "";

    var payload = {
      appointment_date: appointmentDateInput.value,
      buyer_code: buyerCodeInput.value,
      buyer_name: buyerNameInput.value,
      order_number: orderNumberInput.value,
      order_status: orderStatusSelect.value,
      location: locationSelect.value,
      appointment_id: appointmentIdInput.value,
      max_qty: Number(maxQtyInput.value),
      time_slot: timeSlotInput.value,
      status: statusSelect.value,
      picklist_number: salesPicklistNumberInput.value
    };

    if (!isSalesAppointmentDateAllowed(payload.appointment_date)) {
      salesUtilityMessage.textContent = getSalesDateRestrictionMessage();
      return;
    }

    var managedValueError = validateManagedSalesValues(payload);
    if (managedValueError) {
      salesUtilityMessage.textContent = managedValueError;
      return;
    }

    var duplicateSalesPicklist = isDuplicatePicklistExempt(payload.picklist_number) ? null : orders.find(function (order) {
      return String(order.picklist_number) === String(payload.picklist_number) &&
        String(order.id) !== String(currentSalesOrderId) &&
        String(payload.picklist_number) !== "";
    });

    if (duplicateSalesPicklist) {
      salesUtilityMessage.textContent = "Duplicate picklist number is not allowed.";
      return;
    }

    var response = await saveSalesPayload(payload, currentSalesOrderId);
    if (response.error) {
      showSalesError(response.error.message);
      return;
    }

    salesUtilityMessage.textContent = currentSalesOrderId ? "Order updated." : "Order saved.";
    showToast(currentSalesOrderId ? "Order updated." : "Order saved.");
    resetSalesFormState();
    await loadAppData();
  });

  loadSalesOrderButton.addEventListener("click", function () {
    salesUtilityMessage.textContent = "";
    loadSalesOrderIntoForm(salesOrderSearchInput.value);
  });

  resetSalesFormButton.addEventListener("click", function () {
    salesUtilityMessage.textContent = "";
    resetSalesFormState();
  });

  opsAppointmentDateSelect.addEventListener("change", renderOpsFilters);
  opsLocationSelect.addEventListener("change", renderOpsFilters);
  opsBuyerCodeSelect.addEventListener("change", renderOpsFilters);
  if (toggleOpsEditModeButton) {
    toggleOpsEditModeButton.addEventListener("click", function () {
      opsEditMode = !opsEditMode;
      renderOpsFilters();
    });
  }
  picklistOrderSelect.addEventListener("change", function () {
    var selectedOrder = orders.find(function (order) {
      return String(order.id) === String(picklistOrderSelect.value);
    });
    selectedOpsOrderText.value = selectedOrder ? selectedOrder.order_number : "";
    picklistNumberInput.value = selectedOrder && hasValue(selectedOrder.picklist_number) ? selectedOrder.picklist_number : "";
    picklistQtyInput.value = selectedOrder && hasValue(selectedOrder.picklist_qty) ? selectedOrder.picklist_qty : "";
  });
  copyOpsOrderButton.addEventListener("click", async function () {
    if (!selectedOpsOrderText.value) {
      opsEmptyMessage.textContent = "Select an order first to copy it.";
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedOpsOrderText.value);
      opsEmptyMessage.textContent = "Selected order copied.";
    } catch (error) {
      selectedOpsOrderText.focus();
      selectedOpsOrderText.select();
      opsEmptyMessage.textContent = "Clipboard access blocked. The order text is selected, press Ctrl+C.";
    }
  });

  picklistForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    opsEmptyMessage.textContent = "";
    var preservedOpsFilters = captureOpsFilterState();

    var duplicate = isDuplicatePicklistExempt(picklistNumberInput.value) ? null : orders.find(function (order) {
      return String(order.picklist_number) === String(picklistNumberInput.value) &&
        String(order.id) !== String(picklistOrderSelect.value) &&
        String(picklistNumberInput.value) !== "";
    });

    if (duplicate) {
      opsEmptyMessage.textContent = "Duplicate picklist number is not allowed.";
      return;
    }

    var response = await supabaseClient
      .from("orders")
      .update({
        picklist_number: Number(picklistNumberInput.value),
        picklist_qty: Number(picklistQtyInput.value),
        last_updated_by_user: getCurrentEntryUserLabel(),
        updated_at: new Date().toISOString()
      })
      .eq("id", picklistOrderSelect.value);

    if (response.error) {
      opsEmptyMessage.textContent = response.error.message;
      return;
    }

    opsEmptyMessage.textContent = "Picklist saved.";
    showToast("Picklist saved.");
    await loadAppData();
    restoreOpsFilterState(preservedOpsFilters);
  });

  fcAppointmentDateSelect.addEventListener("change", renderFcFilters);
  fcBuyerCodeSelect.addEventListener("change", renderFcFilters);
  dispatchOrderSelect.addEventListener("change", function () {
    var selectedOrder = orders.find(function (order) {
      return String(order.id) === String(dispatchOrderSelect.value);
    });

    vehicleNumberInput.value = selectedOrder ? selectedOrder.vehicle_number || "" : "";
    vehicleTypeInput.value = selectedOrder ? selectedOrder.vehicle_type || "" : "";
    boxesInput.value = selectedOrder && hasValue(selectedOrder.boxes) ? selectedOrder.boxes : "";
    dispatchStatusSelect.value = selectedOrder ? selectedOrder.dispatch_status || "Pending" : "Pending";
  });

  dispatchForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var selectedDispatchOrder = orders.find(function (order) {
      return String(order.id) === String(dispatchOrderSelect.value);
    });
    var dispatchedAt = new Date().toISOString();
    var response;
    var reportResponse;

    if (!boxesInput.value || Number(boxesInput.value) <= 0) {
      fcUtilityMessage.textContent = "Boxes must be a positive number.";
      return;
    }

    if (!vehicleTypeInput.value) {
      fcUtilityMessage.textContent = "Vehicle Type is required.";
      return;
    }

    fcUtilityMessage.textContent = "";
    response = await supabaseClient
      .from("orders")
      .update({
        vehicle_number: vehicleNumberInput.value,
        vehicle_type: vehicleTypeInput.value,
        boxes: Number(boxesInput.value),
        dispatch_status: dispatchStatusSelect.value || "Pending",
        last_updated_by_user: getCurrentEntryUserLabel(),
        updated_at: new Date().toISOString()
      })
      .eq("id", dispatchOrderSelect.value);

    if (response.error) {
      fcUtilityMessage.textContent = response.error.message;
      return;
    }

    if ((dispatchStatusSelect.value || "Pending") === "Dispatched" && selectedDispatchOrder) {
      reportResponse = await supabaseClient
        .from("dispatch_reports")
        .upsert({
          order_id: selectedDispatchOrder.id,
          order_number: selectedDispatchOrder.order_number,
          appointment_date: selectedDispatchOrder.appointment_date,
          buyer_code: selectedDispatchOrder.buyer_code,
          buyer_name: selectedDispatchOrder.buyer_name,
          location: selectedDispatchOrder.location,
          dispatched_at: dispatchedAt,
          vehicle_number: vehicleNumberInput.value,
          vehicle_type: vehicleTypeInput.value,
          boxes: Number(boxesInput.value),
          dispatch_status: "Dispatched",
          created_by_user: getCurrentEntryUserLabel()
        }, {
          onConflict: "order_id"
        });

      if (reportResponse.error) {
        fcUtilityMessage.textContent = "Dispatch updated, but report capture failed: " + reportResponse.error.message;
        await loadAppData();
        return;
      }
    }

    dispatchForm.reset();
    dispatchStatusSelect.value = "Pending";
    fcUtilityMessage.textContent = "Dispatch updated.";
    showToast("Dispatch updated.");
    await loadAppData();
  });

  searchInput.addEventListener("input", function () {
    window.clearTimeout(boardSearchTimer);
    boardSearchTimer = window.setTimeout(function () {
      refreshBoardView();
    }, 250);
  });
  boardAppointmentDateSelect.addEventListener("change", refreshBoardView);
  boardDispatchStatusSelect.addEventListener("change", refreshBoardView);
  boardBuyerNameSelect.addEventListener("change", refreshBoardView);
  boardBuyerCodeSelect.addEventListener("change", refreshBoardView);
  boardLocationSelect.addEventListener("change", refreshBoardView);
  dashboardLocationAppointmentDate.addEventListener("change", renderDashboard);
  dashboardBuyerAppointmentDate.addEventListener("change", renderDashboard);
  auditActionFilter.addEventListener("change", renderAuditHistory);
  auditDateFilter.addEventListener("change", renderAuditHistory);
  auditSearchInput.addEventListener("input", renderAuditHistory);
  resetAuditFiltersButton.addEventListener("click", resetAuditFilters);
  resetDashboardFiltersButton.addEventListener("click", resetDashboardFilters);
  resetBoardFiltersButton.addEventListener("click", resetBoardFilters);
  if (boardShowDeleted) {
    boardShowDeleted.addEventListener("change", function () {
      currentPage = 1;
      loadAppData();
    });
  }
  previousPageButton.addEventListener("click", goToPreviousPage);
  nextPageButton.addEventListener("click", goToNextPage);
  pageSizeSelect.addEventListener("change", function () { currentPage = 1; renderTable(); });
  deleteAllOrdersButton.addEventListener("click", function () {
    if (window.confirm("Delete all order entries? This cannot be undone.")) {
      deleteAllOrders();
    }
  });
  deleteDispatchedOrdersButton.addEventListener("click", function () {
    if (window.confirm("Delete all dispatched order entries? You can restore them later from the deleted view.")) {
      deleteAllDispatchedOrders();
    }
  });
  purgeDeletedOrdersButton.addEventListener("click", function () {
    if (window.confirm("Permanently delete all soft-deleted entries? This cannot be undone.")) {
      purgeSoftDeletedOrders();
    }
  });
  createUserForm.addEventListener("submit", createDispatchUser);
  buyerCodeInput.addEventListener("change", syncBuyerNameFromCode);
  tableBody.addEventListener("click", function (event) {
    var orderId = event.target && event.target.getAttribute("data-order-id");

    if (event.target && event.target.className.indexOf("order-link-btn") !== -1 && orderId) {
      openOrderDetails(orderId);
      return;
    }

    if (event.target && event.target.className.indexOf("picklist-link-btn") !== -1 && orderId) {
      openOrderInOps(orderId);
      return;
    }

    if (event.target && event.target.className.indexOf("restore-order-btn") !== -1 && orderId) {
      if (window.confirm("Restore this soft-deleted order entry?")) {
        restoreOrder(orderId);
      }
      return;
    }

    if (event.target && event.target.className.indexOf("purge-order-btn") !== -1 && orderId) {
      if (window.confirm("Permanently delete this soft-deleted order entry? This cannot be undone.")) {
        purgeDeletedOrder(orderId);
      }
      return;
    }

    if (event.target && event.target.className.indexOf("delete-order-btn") !== -1 && orderId) {
      if (window.confirm("Delete this order entry? You can restore it later from the deleted view.")) {
        deleteOrder(orderId);
      }
    }
  });
  adminPanel.addEventListener("click", async function (event) {
    var type = event.target && event.target.getAttribute("data-type");
    var value = event.target && event.target.getAttribute("data-value");

    if (!event.target || event.target.className.indexOf("chip-remove-btn") === -1 || !type) {
      return;
    }

    await removeMasterDataValue(type, value);
  });
  downloadTemplateButton.addEventListener("click", downloadTemplate);
  exportSalesButton.addEventListener("click", exportSalesData);
  exportAllOrdersButton.addEventListener("click", exportAllOrdersData);
  downloadOpsTemplateButton.addEventListener("click", downloadOpsTemplate);
  exportOpsButton.addEventListener("click", exportOpsData);
  downloadFcTemplateButton.addEventListener("click", downloadFcTemplate);
  exportFcButton.addEventListener("click", exportFcData);
  exportDispatchReportButton.addEventListener("click", exportDispatchReportData);
  exportBoardButton.addEventListener("click", exportBoardData);
  exportPendingPicklistReportButton.addEventListener("click", exportPendingPicklistReport);
  exportPendingDispatchReportButton.addEventListener("click", exportPendingDispatchReport);
  exportDispatchedTodayReportButton.addEventListener("click", exportDispatchedTodayReport);
  closeOrderDetailsButton.addEventListener("click", closeOrderDetails);
  orderDetailsPanel.addEventListener("click", function (event) {
    if (event.target === orderDetailsPanel) {
      closeOrderDetails();
    }
  });
  addBuyerButton.addEventListener("click", async function () {
    await addBuyerMasterData();
  });
  addLocationButton.addEventListener("click", async function () {
    await addMasterDataValue("location", masterLocationInput.value);
    masterLocationInput.value = "";
  });
  addOrderStatusButton.addEventListener("click", async function () {
    await addMasterDataValue("status", masterOrderStatusInput.value);
    masterOrderStatusInput.value = "";
  });
  salesImportFile.addEventListener("change", function (event) {
    if (event.target.files && event.target.files[0]) {
      importSalesCsv(event.target.files[0]);
      event.target.value = "";
    }
  });

  async function initialize() {
  setStaticOptions();
  resetSalesFormState();
    var sessionResponse = await supabaseClient.auth.getSession();
    currentSession = sessionResponse.data.session;
    updateAuthView();
    if (!currentSession) {
      loginMessage.textContent = "Use your Supabase email and password to sign in.";
    }
  }

  window.onerror = function (message) {
    loginMessage.textContent = "App error: " + message;
  };

  initialize();
}());
