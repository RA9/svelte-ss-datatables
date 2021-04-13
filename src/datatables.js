import {writable} from "svelte/store";


export const rows = writable([]);


export const datatables = {
    settings: {
        url: null,
        key_prefix: "lbt",
        limit: 10,
        steps: true,
        use_offset: true, // if it is true it uses offset or vice-versa
        multisort: false,
        headers: {},
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
      },
    
      // stores the ui state
      meta: {
        loading: false,
        status: null,
      },
    
      // stores the parameters passed in query string
      params: {
        limit: 10,
        offset: 0,
        search: null,
        total: 0,
        page: 0,
      },
    
      // stores the table rows
    //   rows: [],
    
      // stores the column(s) sorting state
      sort: {},
      // methods or functions that will serve as utility modifiers
      modifiers: {
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
      },
    
      init(config) {
        // set preferences from localStorage
        this.params.limit = localStorage.getItem(this.settings.key_prefix + ".limit");
        if (this.params.limit < 10 || this.params.limit > 100) {
          this.params.limit = this.settings.limit;
        }
        // apply settings - should this use getters/setter methods to sanity check input?
        for (let i in config) {
          if (this.settings.hasOwnProperty(i)) {
            this.settings[i] = config[i];
          }
        }
        // fetch data
        return this.fetchData();
      },
    
      fetchData() {
        if (!this.settings.url) {
          this.setStatus("Missing api url, pass it in the settings.");
          return;
        }
        meta.loading = true;
        setStatus(settings.messages.loading);
        // console.log("url: ", this.settings.url + this.getUrlParams())
        const addParams =
          settings.steps || settings.use_offset ? getUrlParams() : "";
        fetch(settings.url + addParams, {
          headers: Object.assign({
            "X-Requested-With": "XMLHttprequest"
          },this.settings.headers)
        })
          .then((response) => {
            return response.json();
          })
          .then((json) => {
            $rows.set([]);
    
            // console.log("total: ", this.params.total)
            const data = formatDataNames(json);
            for (let i in data) {
              addRow(data[i]);
            }
            params.total = json.total ?? json[settings.totalName] ?? $rows.length;
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
            this.setStatus(settings.messages.failed);
          });
      },
    
      formatDataNames(json) {
        if (!!this.settings.dataName) {
          const name_arr = this.settings.dataName.split(" ");
          if (name_arr.length === 1) {
            return json[name_arr.pop()];
          }
    
          if (name_arr.length === 2) {
            return json[name_arr[0]][name_arr[1]];
          }
        }
        return json.data;
      },
    
      addRow(data) {
        // todo check for field formatter by name
        let row = {};
        for (let i in data) {
          if (typeof this.settings.formatters[i] == "function") {
            // console.log("Rows: ", i, this.settings.formatters);
            const fn = this.settings.formatters[i];
            row[i] = fn(data[i], data, modifiers);
          } else {
            row[i] = data[i];
          }
        }
        $rows.set([row]);
      },
    
      getUrlParams() {
        const offset = !this.settings.steps ? this.params.page : this.params.offset;
        console.log("Our offset: ", offset);
        let str = `?${this.settings.names.limit}=${this.params.limit}&${this.settings.names.offset}=${offset}`;
        if (params.search) {
          str += `&${this.settings.names.search}=${this.params.search}`;
        }
    
        let sorts = null;
        for (let i in sort) {
          sorts = i + ":" + sort[i];
        }
        if (sorts) {
          str += `&${this.settings.names.sort}=${sorts}`;
        }
    
        return str;
      },
    
      // returns the current page number
      getCurrentPage() {
        if (this.params.offset == 0) {
          return 1;
        }
        return parseInt(this.params.offset) / parseInt(this.params.limit) + 1;
      },
    
      // returns the total number of pages in the data set (on the server, requires total to be passed in result)
      getTotalPages() {
        return Math.ceil(parseInt(this.params.total) / parseInt(this.params.limit));
      },
    
      // returns the total number of rows of data on the server
      getTotalRows() {
        return parseInt(this.params.total);
      },
    
      // returns the offset of the first row
      getFirstPageOffset() {
        return 0;
      },
    
      // returns the offset of the first row on the previous page
      getPrevPageOffset() {
        if (this.settings.steps) {
          let int = (this.getCurrentPage() - 2) * parseInt(this.params.limit);
          return int < 0 ? 0 : int;
        }
        return this.getCurrentPage() < 0 ? 0 : this.getCurrentPage() - 1;
      },
    
      // returns the offset of the first row on the next page
      getNextPageOffset() {
        let int = parseInt(this.getCurrentPage()) * parseInt(this.params.limit);
        return int;
      },
    
      // returns the offset of the first row on the last page
      getLastPageOffset() {
        let int = (this.getTotalPages() - 1) * parseInt(this.params.limit);
        return int < 0 ? 0 : int;
      },
    
      // returns the offset for a particular page, (this may be slightly off depending on the limit chosen)
      getOffsetForPage() {
        // determine correct offset boundary for the current page
        // loop through pages, if (offset between prev and next) recalculate
        for (let i = 0; i < parseInt(this.params.total); i += parseInt(this.params.limit)) {
          if (i >= this.getPrevPageOffset() && i <= this.getNextPageOffset()) {
            return i + parseInt(this.params.limit);
          }
        }
        return this.getLastPageOffset();
      },
    
      // returns the index of first row on the page
      getFirstDisplayedRow() {
        return this.params.offset + 1;
      },
    
      // returns the index of last row on the page
      getLastDisplayedRow() {
        let int = parseInt(this.params.offset) + parseInt(this.params.limit);
        if (int > this.params.total) {
          int = this.params.total;
        }
        return int;
      },
    
      // returns a status summary, either number of rows or number of pages
      getSummary(type = "rows", name = "results") {
        if (!this.rows.length) {
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
      },
    
      // returns the required icon for the sort state
      getSortIcon(col) {
        let icon = "none";
        if (undefined !== this.sort[col]) {
          this.icon = this.sort[col];
        }
        return (
          '<svg class="icon"><use xlink:href="' +
          this.settings.icon +
          "#sort-" +
          this.icon +
          '"></use></svg>'
        );
      },
      // set the number of rows to show per page and saves preference in localStorage
      // tries to keep the current row on the page
      setLimit() {
        // sanity check input
        if (this.params.limit < 10 || this.params.limit > 100) {
          this.params.limit = 25;
        }
        // reset offset and fetch
        // determine current position, if greater than last page, go to last page
        // get currentpageoffset
        this.params.offset = this.getOffsetForPage();
        // store preference
        localStorage.setItem(this.settings.key_prefix + ".limit", this.params.limit);
        return this.fetchData();
      },
    
      // sets the statusbar text
      setStatus(str) {
        this.meta.status = str;
      },
      // toggle the sort state between 'null', 'asc' and 'dsc'
      toggleSortColumn(col) {
        if (undefined == this.sort[col]) {
          this.sort[col] = "asc";
        } else if (this.sort[col] == "asc") {
          this.sort[col] = "dsc";
        } else if (this.sort[col] == "dsc") {
          delete this.sort[col];
        }
      },
    
      // sets the offset to the first page and fetches the data
      goFirstPage() {
        this.params.offset = this.getFirstPageOffset();
        return this.fetchData();
      },
    
      // sets the offset to the top of the last page and fetches the data
      goLastPage() {
        this.params.offset = this.getLastPageOffset();
        return this.fetchData();
      },
    
      // sets the offset to the top of the next page and fetches the data
      goNextPage() {
        this.params.offset = this.getNextPageOffset();
        if (!this.settings.steps) {
          this.params.page += 1;
        }
        
        return this.fetchData();
      },
    
      // sets the offset to the top of the previous page and fetches the data
      goPrevPage() {
        this.params.offset = this.getPrevPageOffset();
        if (!this.settings.steps) {
          this.params.page -= 1;
        }
        return this.fetchData();
      },
    
      // todo jump to a particular page by number
      goToPage() {},
    
      // handle the user search input, always returning to the start of the results
      doSearch() {
        this.params.offset = 0;
        return this.fetchData();
      },
    
      // handle the column sort
      doSort(col) {
        if (false == this.settings.multisort) {
          let state = this.sort[col];
          this.sort = {};
          this.sort[col] = state;
        }
        this.toggleSortColumn(col);
        return this.fetchData();
      },
    
      updateTable(config) {
        if (config.update) {
          for (let i in config) {
            if (this.settings.hasOwnProperty(i)) {
              this.settings[i] = config[i];
            }
          }
          return this.init();
        }
      },
    
     debug() {
        return JSON.stringify(this.params) + JSON.stringify(this.meta) + JSON.stringify(this.sort);
      }
}