interface PPProps {
  countButtonSelector: string;
  countValueSelector: string;
}

class PP {
  $countButton: JQuery;
  $countValue: JQuery;

  count = 0;

  constructor(props: PPProps) {
    const { countButtonSelector, countValueSelector } = props;

    this.$countButton = $(countButtonSelector);
    this.$countValue = $(countValueSelector);
  }

  initEvents() {
    this.$countButton.on('click', () => {
      this.count++;
      this.$countValue.text(this.count);
    });
  }

  async init() {
    this.initEvents();
  }
}

const pp = new PP({
  countButtonSelector: '#count-button',
  countValueSelector: '#count-value',
});

pp.init().catch((err) => {
  console.error(err);
});
