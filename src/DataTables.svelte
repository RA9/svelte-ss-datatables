<script>
  export let options = {};

  let settings = {
    url: null,
    key_prefix: "lbt",
    limit: 10,
    steps: true,
    use_offset: true, // if it is true it uses offset or vice-versa
    multisort: false,
    messages: {
      loading: "Loading...",
      failed: "Loading failed",
      summary: "rows",
    },
    formatters: {},
    //   icon: "../dist/icons.svg",
    icon: "",
    names: {
      limit: "limit", // depends on how it is called on your api endpoint i.e size but the default is limit
      offset: "offset", // depends on how it is called on your api endpoint i.e page but the default is offset
      search: "search", // depends on how it is called on your api endpoint i.e srch but the default is search
      sort: "sort", // depends on how it is called on your api endpoint i.e srt but the default is sort
    },
    // A way we can access your data from the url
    dataName: "",
    totalName: "",
  };

  // stores the ui state
  const meta = {
    loading: false,
    status: null,
  };

  // stores the parameters passed in query string
  const params = {
    limit: 10,
    offset: 0,
    search: null,
    total: 0,
    page: 0,
  };

  // stores the table rows
  const rows = [];

  // stores the column(s) sorting state
  const sort = {};
  // methods or functions that will serve as utility modifiers
  const modifiers = {
    formatDate(date) {
      return new Date(date).toLocaleString("en-US", {
        hour12: false,
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      });
    },
    fullName(f, m, l) {
      return `${f} ${!!m ? m + "." : ""} ${l} `;
    },
  };

  function init() {
    // set preferences from localStorage
    params.limit = localStorage.getItem(settings.key_prefix + ".limit");
    if (params.limit < 10 || params.limit > 100) {
      params.limit = settings.limit;
    }
    // apply settings - should this use getters/setter methods to sanity check input?
    for (let i in options) {
      if (settings.hasOwnProperty(i)) {
        settings[i] = options[i];
      }
    }
    // fetch data
    fetchData();
  }

  function fetchData() {
    if (!settings.url) {
      this.setStatus("Missing api url, pass it in the settings.");
      return;
    }
    meta.loading = true;
    setStatus(settings.messages.loading);
    // console.log("url: ", this.settings.url + this.getUrlParams())
    const addParams =
      settings.steps || settings.use_offset ? getUrlParams() : "";
    fetch(settings.url + addParams, {
      headers: {
        "X-Requested-With": "XMLHttprequest",
        tenant: settings.schema,
      },
    })
      .then((response) => {
        return response.json();
      })
      .then((json) => {
        rows = [];

        // console.log("total: ", this.params.total)
        const data = formatDataNames(json);
        for (let i in data) {
          addRow(data[i]);
        }
        params.total = json.total ?? json[settings.totalName] ?? rows.length;
      })
      .then(() => {
        meta.loading = false;
        setStatus(getSummary(settings.messages.summary));
      })
      .catch((error) => {
        console.error(
          "Network fetch failed, did you set the endpoint correctly? Error: ",
          error
        );
        setStatus(settings.messages.failed);
      });
  }

  function formatDataNames(json) {
    if (!!settings.dataName) {
      const name_arr = settings.dataName.split(" ");
      if (name_arr.length === 1) {
        return json[name_arr.pop()];
      }

      if (name_arr.length === 2) {
        return json[name_arr[0]][name_arr[1]];
      }
    }
    return json.data;
  }

  function addRow(data) {
    // todo check for field formatter by name
    let row = {};
    for (let i in data) {
      if (typeof settings.formatters[i] == "function") {
        // console.log("Rows: ", i, this.settings.formatters);
        const fn = settings.formatters[i];
        row[i] = fn(data[i], data, modifiers);
      } else {
        row[i] = data[i];
      }
    }
    this.rows.push(row);
  }

  function getUrlParams() {
    const offset = !settings.steps ? params.page : params.offset;
    console.log("Our offset: ", offset);
    let str = `?${settings.names.limit}=${params.limit}&${settings.names.offset}=${offset}`;
    if (params.search) {
      str += `&${settings.names.search}=${params.search}`;
    }

    let sorts = null;
    for (let i in sort) {
      sorts = i + ":" + sort[i];
    }
    if (sorts) {
      str += `&${settings.names.sort}=${sorts}`;
    }

    return str;
  }

  // returns the current page number
  function getCurrentPage() {
    if (params.offset == 0) {
      return 1;
    }
    return parseInt(params.offset) / parseInt(params.limit) + 1;
  }

  // returns the total number of pages in the data set (on the server, requires total to be passed in result)
  function getTotalPages() {
    return Math.ceil(parseInt(params.total) / parseInt(params.limit));
  }

  // returns the total number of rows of data on the server
  function getTotalRows() {
    return parseInt(params.total);
  }

  // returns the offset of the first row
  function getFirstPageOffset() {
    return 0;
  }

  // returns the offset of the first row on the previous page
  function getPrevPageOffset() {
    if (settings.steps) {
      let int = (getCurrentPage() - 2) * parseInt(params.limit);
      return int < 0 ? 0 : int;
    }
    return getCurrentPage() < 0 ? 0 : getCurrentPage() - 1;
  }

  // returns the offset of the first row on the next page
  function getNextPageOffset() {
    let int = parseInt(getCurrentPage()) * parseInt(params.limit);
    return int;
  }

  // returns the offset of the first row on the last page
  function getLastPageOffset() {
    let int = (getTotalPages() - 1) * parseInt(params.limit);
    return int < 0 ? 0 : int;
  }

  // returns the offset for a particular page, (this may be slightly off depending on the limit chosen)
  function getOffsetForPage() {
    // determine correct offset boundary for the current page
    // loop through pages, if (offset between prev and next) recalculate
    for (let i = 0; i < parseInt(params.total); i += parseInt(params.limit)) {
      if (i >= getPrevPageOffset() && i <= getNextPageOffset()) {
        return i + parseInt(params.limit);
      }
    }
    return getLastPageOffset();
  }

  // returns the index of first row on the page
  function getFirstDisplayedRow() {
    return params.offset + 1;
  }

  // returns the index of last row on the page
  function getLastDisplayedRow() {
    let int = parseInt(this.params.offset) + parseInt(this.params.limit);
    if (int > this.params.total) {
      int = this.params.total;
    }
    return int;
  }

  // returns a status summary, either number of rows or number of pages
  function getSummary(type = "rows", name = "results") {
    if (!rows.length) {
      return "No results";
    }
    if (type.toLowerCase() == "pages") {
      return (
        "Showing page <strong>" +
        this.getCurrentPage() +
        "</strong> of <strong>" +
        this.getTotalPages() +
        "</strong>"
      );
    }
    return `Showing
                <span class="font-medium">${getFirstDisplayedRow()}</span>
            to
            <span class="font-medium">${getLastDisplayedRow()}</span>
            of
            <span class="font-medium">${getTotalRows()}</span>
            ${name}`;
  }

  // returns the required icon for the sort state
  function getSortIcon(col) {
    let icon = "none";
    if (undefined !== sort[col]) {
      icon = sort[col];
    }
    return (
      '<svg class="icon"><use xlink:href="' +
      settings.icon +
      "#sort-" +
      icon +
      '"></use></svg>'
    );
  }
  // set the number of rows to show per page and saves preference in localStorage
  // tries to keep the current rows on the page
  function setLimit() {
    // sanity check input
    if (params.limit < 10 || params.limit > 100) {
      params.limit = 25;
    }
    // reset offset and fetch
    // determine current position, if greater than last page, go to last page
    // get currentpageoffset
    params.offset = getOffsetForPage();
    // store preference
    localStorage.setItem(settings.key_prefix + ".limit", params.limit);
    fetch();
  }

  // sets the statusbar text
  function setStatus(str) {
    meta.status = str;
  }
  // toggle the sort state between 'null', 'asc' and 'dsc'
  function toggleSortColumn(col) {
    if (undefined == sort[col]) {
      sort[col] = "asc";
    } else if (sort[col] == "asc") {
      sort[col] = "dsc";
    } else if (sort[col] == "dsc") {
      delete sort[col];
    }
  }

  // sets the offset to the first page and fetches the data
  function goFirstPage() {
    params.offset = getFirstPageOffset();
    return fetch();
  }

  // sets the offset to the top of the last page and fetches the data
  function goLastPage() {
    params.offset = getLastPageOffset();
    return fetch();
  }

  // sets the offset to the top of the next page and fetches the data
  function goNextPage() {
    params.offset = getNextPageOffset();
    if (!settings.steps) {
      params.page += 1;
    }
    console.log("Offset: ", params.offset, params.page);
    fetch();
  }

  // sets the offset to the top of the previous page and fetches the data
  function goPrevPage() {
    params.offset = getPrevPageOffset();
    if (!settings.steps) {
      params.page -= 1;
    }
    return fetch();
  }

  // todo jump to a particular page by number
  function goToPage() {}

  // handle the user search input, always returning to the start of the results
  function doSearch() {
    params.offset = 0;
    return fetch();
  }

  // handle the column sort
  function doSort(col) {
    if (false == settings.multisort) {
      let state = sort[col];
      sort = {};
      sort[col] = state;
    }
    toggleSortColumn(col);
    return fetch();
  }

  function updateTable(config) {
    if (config.update) {
      for (let i in config) {
        if (settings.hasOwnProperty(i)) {
          settings[i] = settings[i];
        }
      }
      return init();
    }
  }

  function debug() {
    return JSON.stringify(params) + JSON.stringify(meta) + JSON.stringify(sort);
  }

  //init();
</script>

<div class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
  <table class="min-w-full divide-y divide-gray-200">
    <thead>
      <tr>
        <th
          scope="col"
          class="px-6 py-4 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          Message
        </th>
        <th
          scope="col"
          class="px-6 py-4 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          Msisdn
        </th>

        <th
          scope="col"
          class="px-6 py-4 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          Date Created
        </th>

        <th
          scope="col"
          class="px-6 py-4 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          <span class="sr-only">Edit</span>
          Actions
        </th>
        <!--                 <th scope="col" class="px-6 py-3 bg-gray-50">-->
        <!--                     <span class="sr-only">Edit</span>-->
        <!--                 </th>-->
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-gray-200">
      {data}
      {#each rows as row}
        <tr>
          <td
            class="px-6 py-4 whitespace-prewrap text-sm font-medium text-gray-900"
          >
            {row.outgoing_message.message}
          </td>
          <td
            class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
          >
            {row.msisdn.msisdn}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {row.outgoing_message.created_at}
          </td>
          <td class="px-6 py-4 whitespace-nowrap  text-sm font-medium">
            <a href="" class="text-indigo-600  hover:text-indigo-900">Edit</a>
          </td>
        </tr>
      {/each}
      <!-- More rows... -->
    </tbody>
  </table>
  <nav
    class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6"
    aria-label="Pagination"
  >
    <div class="hidden sm:block">
      <p class="text-sm text-gray-700">
        {@html meta.status}
      </p>
    </div>
    <div class="flex-1 flex justify-between sm:justify-end">
      <button
        type="button"
        on:click|preventDefault={goPrevPage}
        class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        :class="getCurrentPage() == 1 ? 'disabled:opacity-50 cursor-not-allowed' : '' "
        :disabled="getCurrentPage() == 1"
      >
        Previous
      </button>

      <button
        type="button"
        on:click|preventDefault={goNextPage}
        class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        :class="getCurrentPage() === getTotalPages() ? 'disabled:opacity-50 cursor-not-allowed' : '' "
        :disabled="getCurrentPage() === getTotalPages()"
      >
        Next
      </button>
    </div>
  </nav>
</div>
