<script>
  import DataTables from "./DataTables.svelte";
  export async function load({ page, fetch }) {
    const res = await fetch(
      `https://hacker-news.firebaseio.com/v0/item/2921983.json?print=pretty`
    );
    const user = await res.json();
    return {
      props: {
        name: page.params.name,
        user,
      },
    };
  }
  const options = {
    url: "https://lonocore.kwagei.com/messages",
    steps: false,
    dataName: "messages rows",
    totalName: "total_records",
    formatters: {
      outgoing_message: function (val, data, modifiers) {
        const message = val.message.split(" ");
        val.message =
          message.length > 8
            ? message.splice(0, 10).join(" ") + "..."
            : val.message;
        val["created_at"] = modifiers.formatDate(val["created_at"]);
        return val;
      },
    },
  };

  export let user;
</script>

<DataTables {options} />

{user}
